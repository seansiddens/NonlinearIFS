/***
 * Returns the nth column of a matrix.
 * @param mat
 * @param n
 * @returns {Array}
 */
function getColumn(mat, n) {
    return mat.map(x => x[n]);
}

/***
 * Returns the dot product of two vectors. Arrays are treated and are assumed
 * to have homogenous types.
 * @param a {Array} Vector a
 * @param b {Array} Vector b
 * @returns {null|number}
 */
function dot(a, b) {
    if (a.length !== b.length) {
        console.log("ERROR: Dot product dimension mismatch!");
        return null;
    }
    var sum = 0;
    for (i = 0; i < a.length; i++) {
        sum += (a[i] * b[i]);
    }
    return sum;
}

/***
 * Returns the product of two matrices.
 * @param A {Array} Matrix A
 * @param B {Array} Matrix B
 * @returns {null|*[]}
 */
function matrixMultiply(A, B) {
    console.log(A.length);
    console.log(B[0].length);

    // Columns of A must be equal to rows of B
    if (A[0].length !== B.length) {
        console.log("ERROR: Matrix multiplication dimension mismatch!");
        return null;
    }
    // Dimension of product matrix is: (# of rows of A) x (# of columns of B)
    var C = []
    for (let i = 0; i < A.length; i++) {
        var row = []
        for (let j = 0; j < B[0].length; j++) {
            // C[i][j] = dot(ith row of A, jth col of B)
            row.push(dot(A[i], getColumn(B, j)));
        }
        C.push(row);
    }
    return C;
}