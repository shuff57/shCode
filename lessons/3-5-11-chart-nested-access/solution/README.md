the order summary starts
1. SET total TO 0
2. FOR EACH item IN order.items
3.   SET total TO total + item.price
4. END FOR
5. SET name TO order.customer.name
6. IF order.customer.vip
7.   PRINT name + " (VIP) total: " + total
8. ELSE
9.   PRINT name + " total: " + total
10. END IF
the order summary ends
