let hooks = require('hooks');
let stash = {};
// transctionを見る
// POST (201) /usersの前
// hooks.before("/users > Create a new User > 201", function (transaction) {
//     hooks.log("before　POST (201) /users");
//     // openapi定義の値を書き換える
//     let requestBody = {
//       id: null,
//       name: "hooksEditPostUserName",
//       info: "hoge"
//     }
//     transaction.request.body = JSON.stringify(requestBody);
//     // 送る値をlogに出力
//     hooks.log(transaction.request.body)
//   });