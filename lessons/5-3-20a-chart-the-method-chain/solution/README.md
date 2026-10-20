takeDamage(amount) starts
1. SET health TO health - amount
2. IF health <= 0
3.   CALL die
4. END IF
5. CALL flashRed
back to the caller
