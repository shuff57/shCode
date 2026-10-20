draw() runs
1. IF state is "title"
2.   CALL drawTitle
3.   IF space is pressed
4.     SET state TO "play"
5.   END IF
6. ELSE IF state is "play"
7.   CALL updateGame
8.   IF playerDead
9.     SET state TO "gameover"
10.   END IF
11. ELSE IF state is "gameover"
12.   CALL drawGameOver
13.   IF r is pressed
14.     SET state TO "title"
15.   END IF
16. END IF
end of frame
