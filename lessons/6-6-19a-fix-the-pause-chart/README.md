draw() runs
1. IF state is "play"
2.   CALL updateGame
3.   IF p is pressed
4.     SET state TO "paused"
5.     GO TO step 4
6.   END IF
7. END IF
8. CALL drawPauseScreen
end of frame
