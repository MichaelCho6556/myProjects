import sys
import requests
from bs4 import BeautifulSoup

def decode_and_print(url):
  # fetch html content
  headers = {'User-Agent': 'Mozilla/5.0'}
  response = requests.get(url, headers=headers, timeout = 10)
  # parse 
  soup = BeautifulSoup(response.text, 'html.parser')
  #find table of data
  table_body = soup.find('tbody')

  if table_body:
    rows = table_body.find_all('tr')
  else:
    table = soup.find('table')
    if table:
        rows = table.find_all('tr')
    else:
      return

  if rows is None or len(rows) <= 1:
    return

  # extract data and what grid dimensions 
  grid_data = {}
  max_x = -1
  max_y = -1
  processed_rows = 0

  for row in rows[1:]:
    cells = row.find_all('td')
    if len(cells) == 3:
      # extravt text content and strip whitespace
      x_str = cells[0].get_text(strip=True)
      char = cells[1].get_text(strip=True)
      y_str = cells[2].get_text(strip = True)

      if not x_str or not char or not y_str:
        continue

      x = int(x_str)
      y = int(y_str)
      grid_data[(x,y)] = char
      max_x = max(max_x, x)
      max_y = max(max_y, y)
      processed_rows += 1

  if max_x == -1 or max_y == -1:
    return

  # craete 2d grid
  grid_height = max_y  + 1
  grid_width = max_x + 1
  grid = [[' ' for _ in range(grid_width)] for _ in range(grid_height)]

  for (x, y), char in grid_data.items():
    if 0 <= y < grid_height and 0 <= x < grid_width:
      grid[y][x] = char
  for row in grid:
    print("".join(row))

example_url = "https://docs.google.com/document/d/e/2PACX-1vQGUck9HIFCyezsrBSnmENk5ieJuYwpt7YHYEzeNJkIb9OSDdx-ov2nRNReKQyey-cwJOoEKUhLmN9z/pub"

if __name__ == "__main__":
  decode_and_print(example_url)
    