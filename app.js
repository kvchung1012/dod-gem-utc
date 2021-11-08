var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

// allow cors
var cors = require("cors");
// add library socket.io
const socketio = require("socket.io");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();
const PORT = process.env.PORT || 5000;
// config socket.io
const http = require("http");
const { join } = require("path");
const server = http.Server(app);
const io = socketio(server);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

//app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);

app.use(cors());

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// mảng chứa thông tin tất cả người chơi
var games = [];

//
var game_match = [];
// code in here
io.on("connect", (socket) => {
  console.log("Some one connect...");

  games.push({
    socketId: socket.id,
    martrix: [
      [0, 1, 1],
      [2, 0, 0],
      [2, 0, 0]
    ],
    humanTurn: true,
    humanCanMove: false,
    humanPick: {
      row: -1,
      col: -1,
    },
    suggest: [],
    rowNumber: 2,
    humanPoint: 0,
    botPoint: 0,
    gameScore: {
      human: 0,
      bot: 0,
    },
  });

  io.to(socket.id).emit("startUpGame", {
    row: games.filter((x) => x.socketId === socket.id)[0].rowNumber,
    yourTurn: true,
    youCanMove: false,
  });

  socket.on("req_suggest", (current_row, current_col) => {
    let userConfig = games.filter((x) => x.socketId == socket.id)[0];
    let mtrx = userConfig.martrix;
    // kiểm tra vị trí click
    if (mtrx[current_row][current_col] == 1 && userConfig["humanTurn"]) {
      // lưu lại nước đi vừa chọn
      userConfig["humanPick"]["row"] = current_row;
      userConfig["humanPick"]["col"] = current_col;

      // lấy ra các nước đi gợi ý
      let suggest = [
        {
          row: current_row + 1,
          col: current_col,
        },
        {
          row: current_row,
          col: current_col + 1,
        },
        {
          row: current_row,
          col: current_col - 1,
        },
      ];
      let suggest_result = [];
      let moveOut = false;
      suggest.forEach((element, index) => {
        let i = element["row"];
        let j = element["col"];
        if (i >= 0 && i < mtrx.length && j >= 0 && j < mtrx.length) {
          let value = mtrx[i][j];
          if (value == 0) {
            suggest_result.push(element);
          }
        }
        else if (i == mtrx.length) {
          moveOut = true;
        }
      });

      // lưu lại các nước đi hợp lệ để sau check
      userConfig["suggest"] = suggest_result;
      userConfig["humanCanMove"] = true;
      // return cho client
      if(suggest_result.length>0)
        io.to(socket.id).emit("suggest", suggest_result,current_row, current_col, moveOut);
      else
      {
        MiniMaxEndGame(io, userConfig, false);
        return;
      }
      // sinh nước đi tại đây
    }
  });

  socket.on("move", (row, col) => {
    let userConfig = games.filter((x) => x.socketId == socket.id)[0];
    if (userConfig["humanCanMove"]) {
      // đi ra ngoài
      if (row == undefined && col == undefined) {
        userConfig["humanPoint"]++;
        if (userConfig["humanPoint"] == userConfig.rowNumber) {
          // end game;
          MiniMaxEndGame(io, userConfig, true);
          return;
        }

        userConfig["humanTurn"] = false;
        userConfig["humanCanMove"] = false;
        userConfig.martrix[userConfig["humanPick"].row][
          userConfig["humanPick"].col
        ] = 0;

        io.to(socket.id).emit(
          "move_item_out",
          1,
          userConfig["humanPick"].row,
          userConfig["humanPick"].col
        )
      }

      // trường hợp đi bthg
      else {
        let suggest = userConfig.suggest;
        suggest.forEach((el, idx) => {
          if (el["row"] == row && el["col"] == col) {
            userConfig["humanTurn"] = false;
            userConfig["humanCanMove"] = false;
            userConfig.martrix[row][col] = 1;
            userConfig.martrix[userConfig["humanPick"].row][
              userConfig["humanPick"].col
            ] = 0;

            // gửi kết quả về cho người chơi
            io.to(socket.id).emit(
              "move_item",
              1,  // di chuyển quân cờ 1
              2,  // máy đi
              userConfig["humanPick"].row,
              userConfig["humanPick"].col,
              row,
              col
            );
          }
        });
      }

      // --------------NƯỚC ĐI CỦA MÁY-----------------------------
      let alpha = 10000;
      let beta = -10000;
      var next = (MiniMax(userConfig.martrix, 10, alpha, beta, false, []));
      // xử lý nước đi của máy
      if (next.out) {  // đi ra ngoài
        userConfig["botPoint"]++;
        if (userConfig["botPoint"] == userConfig.rowNumber) {
          // end game
          MiniMaxEndGame(io, userConfig, false);
          return;
        }
        userConfig.martrix[next.current.row][next.current.col] = 0;
        io.to(socket.id).emit(
          "move_item_out",
          1,
          next.current.row,
          next.current.col
        );
      }
      else {
        userConfig.martrix[next.current.row][next.current.col] = 0;
        userConfig.martrix[next.step.row][next.step.col] = 2;
        io.to(socket.id).emit(
          "move_item",
          2,
          1,
          next.current.row,
          next.current.col,
          next.step.row,
          next.step.col
        );
      }
      userConfig["humanTurn"] = true;
    }
  });

  // join group

  socket.on("join_group", (code) => {
    let check = game_match.find((x) => x.code == code);
    if (check == undefined) {
      socket.join(code);
      game_match.push({
        master: socket.id,
        code: code,
        first: socket.id,
        second: "",
        firstStep: true,
        firstCanMove: false,
        secondCanMove: false,
        firstPick: { row: -1, col: -1 }, // vị trí pick hiện tại của người 1
        secondPick: { row: -1, col: -1 },
        martrix: [
          [0, 1, 1],
          [2, 0, 0],
          [2, 0, 0],
        ],
        first_suggest: [],
        second_suggest: [],
        row: 2,
        gameScore: {
          first: 0,
          second: 0,
        },
        score: {
          first: 0,
          second: 0,
        },
      });
      io.to(socket.id).emit("join_status", true, "Thành công you are player 1",1,2); // 1 là người chơi 1, 2 là số dòng bàn cờ
    }
    // đã có nhom
    else {
      if (check["first"] == "") {
        socket.join(code);
        check["first"] = socket.id;
        io.to(socket.id).emit(
          "join_status", true,
          "Thành công you are player 1"
        );
      } else if (check["second"] == "") {
        socket.join(code);
        check["second"] = socket.id;
        io.to(socket.id).emit(
          "join_status", true,
          "Thành công you are player 2",2,check.row
        );
      } else {
        io.to(socket.id).emit("join_status", false, "Phòng đã đủ người");
      }
    }
  });

  socket.on("req_suggest_group", (group, current_row, current_col) => {
    let current_group = game_match.filter((x) => x.code === group)[0];
    if (current_group == undefined || current_group == null) {
      io.to(socket.id).emit("no_group");
      return;
    }
    let turnRequest = current_group["first"] == socket.id ? 1 : 2;
    let mtrx = current_group.martrix;
    // kiểm tra vị trí click
    if (
      mtrx[current_row][current_col] == turnRequest &&
      current_group["firstStep"] == turnRequest &&
      current_group["first"] == socket.id
    ) {
      // lưu lại nước đi vừa chọn
      current_group["firstPick"]["row"] = current_row;
      current_group["firstPick"]["col"] = current_col;

      // lấy ra các nước đi gợi ý
      let suggest = [
        {
          row: current_row + 1,
          col: current_col,
        },
        {
          row: current_row,
          col: current_col + 1,
        },
        {
          row: current_row,
          col: current_col - 1,
        },
      ];
      let suggest_result = [];
      let moveOut = false;
      suggest.forEach((element, index) => {
        let i = element["row"];
        let j = element["col"];
        if (
          i >= 0 &&
          i <= current_group.row &&
          j >= 0 &&
          j <= current_group.row
        ) {
          let value = mtrx[i][j];
          if (value == 0) {
            suggest_result.push(element);
          }
        }
        if ((i > current_group.row)) {
          moveOut = true;
        }
      });

      // lưu lại các nước đi hợp lệ để sau check
      current_group["first_suggest"] = suggest_result;
      current_group["firstCanMove"] = true;
      // return cho client
      if(suggest_result.length===0){
        EndGame(io,current_group,"second");
        return;
      }
      io.to(socket.id).emit("suggest", suggest_result,current_row,current_col, moveOut);
    }

    // người chơi thứ 2 gửi
    else if (
      mtrx[current_row][current_col] == turnRequest &&
      current_group["firstStep"] == false &&
      current_group["second"] == socket.id
    ) {
      current_group["secondPick"]["row"] = current_row;
      current_group["secondPick"]["col"] = current_col;

      // lấy ra các nước đi gợi ý
      let suggest = [
        {
          // tiến lên 1 cột
          row: current_row,
          col: current_col + 1,
        },
        {
          // đi lên trên
          row: current_row + 1,
          col: current_col,
        },
        {
          // đi xuống
          row: current_row - 1,
          col: current_col,
        },
      ];
      let suggest_result = [];
      let moveOut = false;
      suggest.forEach((element, index) => {
        let i = element["row"];
        let j = element["col"];
        if (
          i >= 0 &&
          i <= current_group.row &&
          j >= 0 &&
          j <= current_group.row
        ) {
          let value = mtrx[i][j];
          if (value == 0) {
            suggest_result.push(element);
          }
        }
        // có thể đi ra ngoài
        if (j > current_group.row) {
          moveOut = true;
        }
      });

      // lưu lại các nước đi hợp lệ để sau check
      current_group["second_suggest"] = suggest_result;
      current_group["secondCanMove"] = true;
      // return cho client
      if(suggest_result.length===0){
        EndGame(io,current_group,"first");
        return;
      }
      io.to(socket.id).emit("suggest", suggest_result,current_row,current_col, moveOut);
    }
  });

  socket.on("move_group", (group, row, col) => {
    let current_group = game_match.filter((x) => x.code == group)[0];
    if (current_group == undefined || current_group == null) {
      io.to(socket.id).emit("no_group");
    }
    if (current_group.first != '' && current_group.second != '') {
      let turnRequest = current_group["first"] == socket.id ? 1 : 2;
      if (
        (turnRequest == 1 && current_group["firstCanMove"]) ||
        (turnRequest == 2 && current_group["secondCanMove"])
      ) {
        let suggest =
          turnRequest == 1
            ? current_group["first_suggest"]
            : current_group["second_suggest"];

        suggest.forEach((el, idx) => {
          if (el["row"] == row && el["col"] == col) {
            if (turnRequest == 1) {
              current_group["firstStep"] = false;
              current_group["firstCanMove"] = false;
              current_group.martrix[current_group["firstPick"].row][
                current_group["firstPick"].col
              ] = 0;
            } else {
              current_group["firstStep"] = true;
              current_group["secondCanMove"] = false;
              current_group.martrix[current_group["secondPick"].row][
                current_group["secondPick"].col
              ] = 0;
            }
            current_group.martrix[row][col] = turnRequest;

            // gửi kết quả về cho người chơi
            let oldPick =
              turnRequest == 1
                ? current_group["firstPick"]
                : current_group["secondPick"];

            let turn = current_group["firstStep"];
            io.in(group).emit(
              "move_item",
              turnRequest,
              turn, // gửi về socket id của lượt người chơi sắp tới
              oldPick.row + "",
              oldPick.col + "",
              row,
              col
            );
          }
        });
      }
    }
    else {
      io.to(socket.id).emit('warning', 'Phòng chưa đủ người sao đi được');
    }
  });

  socket.on("move_out_group", (group, res) => {
    let current_group = game_match.filter((x) => x.code == group)[0];
    if (current_group == undefined || current_group == null) {
      io.to(socket.id).emit("no_group");
    }
    let turnRequest = current_group["first"] == socket.id ? 1 : 2;

    let currentPos =
      turnRequest == 1
        ? current_group["firstPick"]
        : current_group["secondPick"];
    current_group["martrix"][currentPos.row][currentPos.col] = 0;

    if (turnRequest == 1) {
      current_group["firstStep"] = false;
      current_group["firstCanMove"] = false;
      current_group["score"]["first"] = current_group["score"]["first"] + 1;
      if (current_group["score"]["first"] == current_group["row"]) {
        EndGame(io, current_group, "first");
        return;
      }
    } else {
      current_group["score"]["second"] = current_group["score"]["second"] + 1;
      current_group["firstStep"] = true;
      current_group["secondCanMove"] = false;
      if (current_group["score"]["second"] == current_group["row"]) {
        EndGame(io, current_group, "second");
        return;
      }
    }
    let turn = current_group["firstStep"];
    io.in(group).emit("move_item_out", turn, currentPos.row, currentPos.col);
  });

  socket.on("change_size", (group, val) => {
    if (group === '') {
      let current_group = games.filter((x) => x.socketId == socket.id)[0];
      current_group.row = val;
      current_group["martrix"].splice(0, current_group["martrix"].length);
      for (let i = 0; i <= current_group["row"]; i++) {
        let rows = [];
        for (let j = 0; j <= current_group["row"]; j++) {
          if (i == 0 && j > 0) {
            rows.push(1);
          } else if (j == 0 && i > 0) {
            rows.push(2);
          } else {
            rows.push(0);
          }
        }
        current_group["martrix"].push(rows);
      }
      io.to(socket.id).emit("resize", val);
    }
    else {
      let current_group = game_match.filter((x) => x.code == group)[0];
      if (current_group == undefined || current_group == null) {
        io.to(socket.id).emit("no_group");
      }
      current_group.row = val;
      current_group["martrix"].splice(0, current_group["martrix"].length);
      for (let i = 0; i <= current_group["row"]; i++) {
        let rows = [];
        for (let j = 0; j <= current_group["row"]; j++) {
          if (i == 0 && j > 0) {
            rows.push(1);
          } else if (j == 0 && i > 0) {
            rows.push(2);
          } else {
            rows.push(0);
          }
        }
        current_group["martrix"].push(rows);
      }

      current_group["score"]["first"] = 0;
      current_group["score"]["second"] = 0;

      io.in(group).emit("resize", val);
    }
  });

  socket.on("disconnect", () => {
    // console.log(socket.id + " leave");
    games = games.filter(x => x.socketId !== socket.id);
    game_match = game_match.filter(x => x.first != socket.id);
    game_match = game_match.filter(x => x.second != socket.id);
  });
});

function EndGame(io, current_group, player) {
  // reset martix
  current_group["martrix"].splice(0, current_group["martrix"].length);
  for (let i = 0; i <= current_group["row"]; i++) {
    let rows = [];
    for (let j = 0; j <= current_group["row"]; j++) {
      if (i == 0 && j > 0) {
        rows.push(1);
      } else if (j == 0 && i > 0) {
        rows.push(2);
      } else {
        rows.push(0);
      }
    }
    current_group["martrix"].push(rows);
  }
  // update score

  current_group["gameScore"][player]++;
  current_group["score"]["first"] = 0;
  current_group["score"]["second"] = 0;

  // send to player

  // gửi về id của người win
  io.in(current_group["code"]).emit(
    "end_game",
    current_group["row"],
    current_group["firstStep"],
    current_group[current_group["firstStep"] ? "second" : "first"],
    current_group["gameScore"][player]
  );
}


function MiniMaxEndGame(io, game, humanWin) {
  // reset martix
  game["martrix"].splice(0, game["martrix"].length);
  for (let i = 0; i <= game["rowNumber"]; i++) {
    let rows = [];
    for (let j = 0; j <= game["rowNumber"]; j++) {
      if (i == 0 && j > 0) {
        rows.push(1);
      } else if (j == 0 && i > 0) {
        rows.push(2);
      } else {
        rows.push(0);
      }
    }
    game["martrix"].push(rows);
  }
  // update score

  game["humanPoint"] = 0;
  game["botPoint"] = 0;

  if (humanWin) {
    game.gameScore.human++;
  }
  else {
    game.gameScore.bot++;
  }

  // send to player

  // gửi về id của người win
  io.to(game.socketId).emit(
    "end_game_bot",
    game["rowNumber"],
    game.gameScore,
    humanWin
  );
}

function MiniMax(node, depth, alpha, beta, isMax, arr) {
  let isEnd = IsEndGameMatrix(node);
  if (isEnd || depth == 0) {
    return {
      matrix: node
    };
  }
  if (isMax) {  // đỉnh max
    let arrMtx = GetChilren(node, true, arr);  // tìm tất cả các con của nút max
    if (arrMtx.length == 0) {  // trường hợp không đi được cũng là nước cuối
      // console.log("node",node,isMax)
      return {
        matrix: node
      };
    }
    arrMtx.forEach(mtx => {
      let best = -10000;
      let res = MiniMax(mtx.matrix, depth - 1, alpha, beta, false, arr);
      let val = GetValueOfMatrix(res.matrix, false);
      best = Math.max(best, val)
      if (best >= beta) {
        return mtx;
      }
      alpha = Math.max(alpha, best);
    })
    return arrMtx[arrMtx.length - 1];
  }
  else { // đỉnh min
    let arrMtx = GetChilren(node, false, arr);  // tìm tất cả các con của nút min
    if (arrMtx.length == 0) {
      // console.log("node",node,isMax)
      return {
        matrix: node
      };
    }
    arrMtx.forEach(mtx => {
      let best = 10000;
      let res = MiniMax(mtx.matrix, depth - 1, alpha, beta, true, arr);
      let val = GetValueOfMatrix(res.matrix, true);
      best = Math.min(best, val)
      if (best <= beta) return mtx;
      beta = Math.min(beta, best)
    })
    return arrMtx[arrMtx.length - 1];
  }
}

// hàm lượng giá
function GetValueOfMatrix(mtrx, isMax) {
  if (isMax) {
    let index = 0;
    let result = 0;
    let count = 0;
    for (let i = 0; i < mtrx.length; i++) {
      for (let j = 0; j < mtrx[i].length; j++) {
        if (mtrx[i][j] == 1) {
          count++;
          result += index * 5;
          for (let k = j - 1; k >= 0; k--) {
            if (mtrx[i][k] == 2) {
              result += (j - k) * 10 + 30;
              break;
            }
          }
        }
        index++;
      }
    }
    //result += (mtrx.length - count - 1) * 100;
    //console.log("max",result);
    return result;
  }
  else {
    let index = 0;
    let result = 0;
    let count = 0;
    for (let i = 0; i < mtrx.length; i++) {
      for (let j = 0; j < mtrx[i].length; j++) {
        if (mtrx[j][i] == 2) {
          count++;
          result -= index * 5;
          for (let k = i - 1; k >= 0; k--) {
            if (mtrx[j][k] == 1) {
              result -= (i - k) * 10 + 30;
              break;
            }
          }
        }
        index++;
      }
    }
    //result -= ((mtrx.length - count - 1) * 100);
    //console.log("min",result);
    return result;
  }
}

function IsEndGameMatrix(martrix, isMax) {
  let first = 0, second = 0;
  martrix.forEach(rows => {
    rows.forEach(val => {
      if (val == 1) {
        first++;
      }
      else if (val == 2) {
        second++;
      }
    })
  });
  return first == 0 || second == 0;
}

function CloneArray(input) {
  let arr = [];
  input.forEach(row => {
    let rows = [];
    row.forEach(col => {
      rows.push(col);
    })
    arr.push(rows);
  })
  return arr;
}

function GetChilren(currentMatrix, isMax, arr) {
  let martrixPending = [];
  if (!isMax) {
    currentMatrix.forEach((rows, i) => {
      rows.forEach((val, j) => {
        // tính nước đi của người số 2;
        if (val == 2) {
          let suggest = [
            {
              // tiến lên 1 cột
              row: i,
              col: j + 1,
            },
            {
              // đi lên trên
              row: i + 1,
              col: j,
            },
            {
              // đi xuống
              row: i - 1,
              col: j,
            },
          ];
          suggest.forEach((next) => {
            if (next.row >= 0 && next.row < currentMatrix.length && next.col >= 0 && next.col < currentMatrix.length) {
              if (currentMatrix[next.row][next.col] == 0) {
                let mtx = CloneArray(currentMatrix);
                mtx[i][j] = 0;
                mtx[next.row][next.col] = 2;
                // if (CheckArrayExit(arr, mtx))
                martrixPending.push({
                  step: next,
                  current: {
                    row: i,
                    col: j
                  },
                  out: false,
                  matrix: mtx
                });
              }
            }
            else if (next.col == currentMatrix.length) {
              let mtx = CloneArray(currentMatrix);
              mtx[i][j] = 0;
              //if (CheckArrayExit(arr, mtx))
              // console.log("move out");
              martrixPending.push({
                step: next,
                current: {
                  row: i,
                  col: j
                },
                out: true,
                matrix: mtx
              });
            }
          });
        }
      })
    })

  }
  else {
    currentMatrix.forEach((rows, i) => {
      rows.forEach((val, j) => {
        if (val == 1) {
          let suggest = [
            {
              row: i + 1,
              col: j,
            },
            {
              row: i,
              col: j + 1,
            },
            {
              row: i,
              col: j - 1,
            },
          ];

          suggest.forEach((next) => {
            if (next.row >= 0 && next.row < currentMatrix.length && next.col >= 0 && next.col < currentMatrix.length) {
              if (currentMatrix[next.row][next.col] == 0) {
                let mtx = CloneArray(currentMatrix);
                mtx[i][j] = 0;
                mtx[next.row][next.col] = 1;

                //if (CheckArrayExit(arr, mtx))
                martrixPending.push({
                  step: next,
                  current: {
                    row: i,
                    col: j
                  },
                  out: false,
                  matrix: mtx
                });
              }
            }
            else if (next.row == currentMatrix.length) {
              let mtx = CloneArray(currentMatrix);
              mtx[i][j] = 0;
              //if (CheckArrayExit(arr, mtx))
              // console.log("move out");

              martrixPending.push({
                step: next,
                current: {
                  row: i,
                  col: j
                },
                out: true,
                matrix: mtx
              });
            }
          });
        }
      })
    })

  }
  return martrixPending;
}

server.listen(PORT, function () {
  console.log("Start server port 5000...");
});

module.exports = app;
