draw() runs
1. IF state is "play"
2.   CALL updateGame
3.   IF p is pressed
4.     SET state TO "paused"
5.   END IF
6. ELSE
7.   CALL drawPauseScreen
8.   IF p is pressed
9.     SET state TO "play"
10.   END IF
11. END IF
end of frame
