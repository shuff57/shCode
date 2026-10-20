draw() runs
1. IF mouse presses AND ball is hovered
2.   SET held TO true
3. END IF
4. IF held AND mouse is pressing
5.   SET ball position TO the mouse
6.   CALL drawBand
7. END IF
8. IF held AND mouse is released
9.   SET force TO (anchor - ball) times POWER
10.   CALL applyForce
11.   SET held TO false
12. END IF
end of frame
