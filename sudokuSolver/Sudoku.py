from pprint import pprint

def find_next_empty(puzzle):
    # finds next row, col on the puzzle thats not filled
    # retunrs row, col tuple

    for r in range(9):
        for c in range(9):
            if puzzle[r][c] == -1: # -1 are empty
                return r, c
    return None, None # if no spaces in the puzzle are empty

def is_valid(puzzle, guess, row, col):
    # figures out whether the guess at the row/col of the puzzle is a valid guess
    # returns True if valid

    # row
    row_vals = puzzle[row]
    if guess in row_vals:
        return False

    # col
    cols_vals = [puzzle[i][col] for i in range(9)]
    if guess in cols_vals:
        return False

    # the square
    # we want to get where the 3x3 square starts
    # iterate over the 3 valeus in row/col
    row_start = (row // 3) * 3      # 1 //3 = 0, 5 // 3 = 1
    col_start = (col // 3) * 3

    for r in range (row_start, row_start + 3):
        for c in range (col_start, col_start + 3):
            if puzzle[r][c] == guess:
                return False

    # if we get here, these checks pass
    return True

def solve_sudoku(puzzle):
    # solve sudoku using backtracking
    # this uses multiple lists, where each inner list is a row in our sudoku puzzle
    # returns whether a solution exists or not
    # mutates puzzle to be the solution

    # choose somewhere on puzzle to make a guess
    row, col = find_next_empty(puzzle)

    # if there's nowhere left, then we're done
    if row is None:
        return True

    # if there is a place to put number, make a guess between 1 and 9
    for guess in range(1,10):
        # check if this is valid guess
        if is_valid(puzzle, guess, row, col):
            # if this is valid, then place that guess on puzzle
            puzzle[row][col] = guess
            # now recurse using this puzzle
            if solve_sudoku(puzzle):
                return True
        # if not valid OR our guess does not solve the puzzle
        # backtrack and try a new number
        puzzle[row][col] = -1       # this resets the guess

    # if none of the numbers work, then the puzzle is unsolvable
    return False


if __name__ == '__main__':
    example_board = [
        [3, 9, -1,   -1, 5, -1,   -1, -1, -1],
        [-1, -1, -1,   2, -1, -1,   -1, -1, 5],
        [-1, -1, -1,   7, 1, 9,   -1, 8, -1],

        [-1, 5, -1,   -1, 6, 8,   -1, -1, -1],
        [2, -1, 6,   -1, -1, 3,   -1, -1, -1],
        [-1, -1, -1,   -1, -1, -1,   -1, -1, 4],

        [5, -1, -1,   -1, -1, -1,   -1, -1, -1],
        [6, 7, -1,   1, -1, 5,   -1, 4, -1],
        [1, -1, 9,   -1, -1, -1,   2, -1, -1]
    ]
    print(solve_sudoku(example_board))
    pprint(example_board) 
