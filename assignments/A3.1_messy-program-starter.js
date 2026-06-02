let p=29.99
let t=0.0725
let n="USB Cable"
let q=3
let s=p*q
let tax=s*t
let total=s+tax
console.log(n+" qty "+q+" subtotal $"+s.toFixed(2))
console.log("tax $"+tax.toFixed(2)+" total $"+total.toFixed(2))
let onSale=true
if(onSale){console.log("ON SALE!")}
