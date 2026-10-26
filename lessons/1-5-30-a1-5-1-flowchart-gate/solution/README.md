Problem: the printer credit

START
INPUT pages
IF pages > 20 THEN
    SET extra TO pages - 20
    SET owed TO extra * 0.10
    REPORT owed
ELSE
    SET owed TO 0
    REPORT owed
END IF
END
