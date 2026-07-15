### description for render

Step 1 - model the concept
The first person view is best to model with an array of wireframed cubes viewed end on, then reduce the field of vision to make the view port.

The cube array is best captured as a plan view from above, and referenced using column, row coordinates

```
-------------------------------------------
|  A5 |  B5 |  C5 |  D5 |  E5 |  F5 |  G5 |
-------------------------------------------
|  A4 |  B4 |  C4 |  D4 |  E4 |  F4 |  G4 |
-------------------------------------------
|  A3 |  B3 |  C3 |  D3 |  E3 |  F3 |  G3 |
-------------------------------------------
|  A4 |  B2 |  C2 |  D2 |  E2 |  F2 |  G2 |
-------------------------------------------
|  A1 |  B1 |  C1 |  D1 |  E1 |  F1 |  G1 |
-------------------------------------------
|  A0 |  B0 |  C0 |  D0 |  E0 |  F0 |  G0 |
-------------------------------------------
_____________________^_____________________
````
First render is to construct the wireframes for the 42 cubes A0 through to G5 from position of the ^ location. 
- The front face of A0, B0, C0, D0, E0, F0, G0 will be 7 squares.
- On first render, the vanishing point of the "A", "B", "C", "D", "E", "F", "G" sequence of cubes (Corridors) would be at the center of the D square.

Terminology
From the diagram above:
- walls that are vertical are parallel with the direction that the user is looking and are Blue
- walls that are horizontal are perpendicular to the direction that the user is looking and are Orange

- new - floor and ceiling to be grey

### Diminishing torchlight
To simulate the diminishing torchlight in the tunnel, there is dimished brightness that is applied to walls, floor and ceiling the further from the current view.

Below is the percentage of full colour for each of the cubes to know how much to fade the walls, ceiling and floor

```
-------------------------------------------
|   0 |   0 |   0 |   0 |   0 |   0 |   0 |
-------------------------------------------
|   0 |   0 |   0 |  20 |   0 |   0 |   0 |
-------------------------------------------
|   0 |   0 |  20 |  40 |  20 |   0 |   0 |
-------------------------------------------
|   0 |  20 |  40 |  60 |  40 |  20 |   0 |
-------------------------------------------
|  20 |  40 |  60 |  80 |  60 |  40 |  20 |
-------------------------------------------
|  40 |  60 |  80 | 100 |  80 |  60 |  40 |
-------------------------------------------
_____________________^_____________________
````
