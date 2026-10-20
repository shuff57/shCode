START
1. CALL loadQueue
2. IF a saved queue was found
3.   SET queue TO the saved queue
4. ELSE
5.   SET queue TO the starting order list
6. END IF
7. CALL sortByPriority
8. FOR EACH order IN queue
9.   CALL estimateHours
10.  CALL priceOf
11.  SET totals TO totals + this order
12. END FOR
13. CALL saveQueue
14. OUTPUT the verdict line
END
