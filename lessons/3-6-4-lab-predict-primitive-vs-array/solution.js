// 3.6.4 Lab: Predict Output — Primitive vs. Array Argument

function changeNum(num) {
  num = 99;
}

function changeArr(arr) {
  arr.push(99);
}

let myNum = 10;
let myArr = [1, 2, 3];

changeNum(myNum);
changeArr(myArr);

console.log(myNum);
console.log(myArr);
