import numpy as np
from PIL import Image
import math

def length_squared(vec):
    """Returns the squared length of an array"""
    sum = 0
    for x in vec:
        sum += x*x
    return sum


def tex_to_im(u, v, width, height):
    """Converts normalized texture coordinates to pixel coordinates into an image."""
    # Flip vertical axis
    y = 1.0 - v

    # Scale tex coord
    x = u * width
    y = y * height

    # Map to discrete values
    x = math.floor(x)
    y = math.floor(y)

    return x, y


def im_to_tex(x, y, width, height):
    """Converts image coordinates to texture coordinates.
    :param x: Horizontal index into image
    :param y: Vertical index into image
    :param width: Width (in pixels) of image
    :param height: Height (in pixels) of image
    :return: Texture coordinates u, v
    """
    # Normalize coordinates
    u = (x + 0.5) / width
    v = (y + 0.5) / height

    # Flip vertical axis
    v = 1.0 - v

    return u, v


def put_pixel(im_arr, x, y, r, g, b):
    """Writes a color to an image array at the specified location. Color channels are normalized!"""



    im_arr[y, x] = [r * 255, g * 255, b * 255]


def create_image(arr, width, height):
    """Creates an image from an array w/ colors values between 0 and 1"""

    im_arr = np.zeros((height, width, 3), dtype=np.uint8)
    for y in range(height):
        for x in range(width):
            r = math.floor(arr[y, x, 0] * 255)
            g = math.floor(arr[y, x, 1] * 255)
            b = math.floor(arr[y, x, 2] * 255)
            im_arr[y, x] = [r, g, b]

    return Image.fromarray(im_arr)


def rsqrt_plane_to_tex(px, py):
    """rsqrt plane to texture function"""
    tx = (px / (2*math.sqrt(1 + px*px))) + 0.5
    ty = (py / (2*math.sqrt(1 + py*py))) + 0.5
    return tx, ty


def rsqrt_tex_to_plane(tx, ty):
    """rsqrt texture to plane function"""
    px = (2*tx - 1) / math.sqrt(1 - (2*tx-1)*(2*tx-1))
    py = (2*ty - 1) / math.sqrt(1 - (2*ty-1)*(2*ty-1))
    return px, py

def w0_inv(px, py):
    px = 2.1*(px + 0.5)
    py = 2.1*(py + 0.5)
    return px, py


def w1_inv(px, py):
    px = 2.1*(px - 0.5)
    py = 2.1*(py + 0.5)
    return px, py


def w2_inv(px, py):
    px = 2.1*px
    py = 2.1*(py - 0.5)
    return px, py


def texture(tex, u, v):
    """Returns color of pixel in an array given texture coordinates"""
    w = len(tex[0])
    h = len(tex)
    x, y = tex_to_im(u, v, w, h)
    return tex[y, x]

def M(x, y, params):
    """Linear affine transformation of x and y by parameters"""
    return params[0]*x + params[1]*y + params[2]

def swirl_inv(x, y):
    r_squared = x*x + y*y
    return x*math.sin(r_squared) + y*math.cos(r_squared), -x*math.cos(r_squared) + y*math.sin(r_squared)

def linear(x, y):
    return x, y

def gamma_correct(col, gamma):
    r = pow(col[0], 1.0 / gamma)
    g = pow(col[1], 1.0 / gamma)
    b = pow(col[2], 1.0 / gamma)
    return [r, g, b]


if __name__ == '__main__':
    width, height = 1028, 1028
    # Initialize starting source texture and make it white in pixels corresponding to bi-unit square on the plane
    print("Initializing starting texture...")
    src = np.zeros((height, width, 3), dtype=float)
    for y in range(height):
        for x in range(width):
            # Convert to tex coords
            tx, ty = im_to_tex(x, y, width, height);

            # Map tex coords to plane
            px, py = rsqrt_tex_to_plane(tx, ty);

            # If the plane coordinates are between -1.0 and 1.0 on the x and y axes, color the pixel white.
            if -1.0 < px < 1.0 and -1.0 < py < 1.0:
                src[y, x] = [1.0, 1.0, 1.0]

            # Color based on distance from origin
            # src[y, x] = [abs(math.sin(math.sqrt(px*px + py*py))), 0.0, 0.0]

    tex = create_image(src, width, height)
    print("Done!")

    # Define the inverse of the IFS functions
    # Sierpinski Triangle
    w0 = ([2.1, 0, 2.1*0.5], [0, 2.1, 2.1*0.5], swirl_inv, [0.5, 0.5, 1.0])
    w1 = ([2.1, 0, -2.1*0.5], [0, 2.1, 2.1*0.5], linear, [0.5, 1.0, 0.5])
    w2 = ([2.1, 0, 0], [0, 2.1, -2.1*0.5], linear, [1.0, 0.5, 0.5])
    ifs_inv = [w0, w1, w2]

    # Render dest texture representing the plane transformed by the IFS
    n = 6
    for k in range(n):
        print("Iteration:", k)
        dest = np.zeros((height, width, 3), dtype=float)
        for y in range(height):
            for x in range(width):
                # Convert to tex coords
                tx, ty = im_to_tex(x, y, width, height)
                # Map tex coords to plane
                px, py = rsqrt_tex_to_plane(tx, ty)

                col = [0, 0, 0]

                for w in ifs_inv:
                    # Apply affine
                    pxi, pyi = M(px, py, w[0]), M(px, py, w[1])
                    # Apply variation
                    pxi, pyi = w[2](pxi, pyi)

                    # Map back to texture
                    u, v = rsqrt_plane_to_tex(pxi, pyi)
                    tex_col = texture(src, u, v) * w[3]
                    col += tex_col

                dest[y, x] = col

        src = dest

    dest_tex = create_image(dest, width, height)
    print("Done!")
    dest_tex.show()


    # Re-project texture to an image viewing the plane from -1.0 to 1.0 on both axes
    scale = 1.25
    img_arr = np.zeros((height, width, 3), dtype=float);
    print("Re-projecting final image...")
    for y in range(height):
        for x in range(width):
            # Tex coords
            tx, ty = im_to_tex(x, y, width, height)

            # Map to plane coords from -1.0 to 1.0 along both axes
            px = tx * 2.0 * scale - scale
            py = ty * 2.0 * scale - scale

            # Map back to texture coords and lookup color
            u, v = rsqrt_plane_to_tex(px, py)
            img_arr[y, x] = gamma_correct(texture(dest, u, v), 3.0)

    im = create_image(img_arr, width, height)
    print("done!")
    im.save("sierpinski_swirl_n6.png")
