describeBox() starts
1. SET width, height and color TO the three values taken out of options (one unpack step)
2. BUILD the note: color + " box " + width + "x" + height
3. IF width > height (the box is wide)
4.   ADD " (wide)" to the end of the note
5. END IF
6. RETURN the note
back to the caller
