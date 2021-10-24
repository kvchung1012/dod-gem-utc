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
const { Console } = require("console");

var app = express();
const PORT = 5000;
// config socket.io
const http = require("http");
const { join } = require("path");
const server = http.createServer(app);
const io = socketio(server);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
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
      [0, 1, 1, 1],
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [2, 0, 0, 0],
    ],
    humanTurn: true,
    humanCanMove: false,
    humanPick: {
      row: -1,
      col: -1,
    },
    suggest: [],
    rowNumber: 3,
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
      suggest.forEach((element, index) => {
        let i = element["row"];
        let j = element["col"];
        let value = mtrx[i][j];
        if (value == 0) {
          suggest_result.push(element);
        }
      });

      // lưu lại các nước đi hợp lệ để sau check
      userConfig["suggest"] = suggest_result;
      userConfig["humanCanMove"] = true;
      // return cho client
      io.to(socket.id).emit("suggest", suggest_result);

      // sinh nước đi tại đây
    }
  });

  socket.on("move", (row, col) => {
    let userConfig = games.filter((x) => x.socketId == socket.id)[0];
    if (userConfig["humanCanMove"]) {
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
            (turn = 1),
            userConfig["humanPick"].row,
            userConfig["humanPick"].col,
            row,
            col
          );

          // sinh nước di của máy ở đây
          return;
        }
      });
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
          [0, 1, 1, 1],
          [2, 0, 0, 0],
          [2, 0, 0, 0],
          [2, 0, 0, 0],
        ],
        first_suggest: [],
        second_suggest: [],
        row: 3,
        gameScore: {
          first: 0,
          second: 0,
        },
        score: {
          first: 0,
          second: 0,
        },
      });
      io.to(socket.id).emit("join_status", true, "Thành công you are player 1");
    }
    // đã có nhom
    else {
      if (check["first"] == "") {
        socket.join(code);
        check["first"] = socket.id;
        io.to(socket.id).emit(
          "join_status",
          true,
          "Thành công you are player 1"
        );
      } else if (check["second"] == "") {
        socket.join(code);
        check["second"] = socket.id;
        io.to(socket.id).emit(
          "join_status",
          false,
          "Thành công you are player 2"
        );
      } else {
        io.to(socket.id).emit("join_status", "Phòng đã đủ người");
      }
    }
  });

  socket.on("req_suggest_group", (group, current_row, current_col) => {
    let current_group = game_match.filter((x) => x.code === group)[0];
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
        if (i > current_group.row) {
          moveOut = true;
        }
      });

      // lưu lại các nước đi hợp lệ để sau check
      current_group["first_suggest"] = suggest_result;
      current_group["firstCanMove"] = true;
      // return cho client
      io.to(socket.id).emit("suggest", suggest_result, moveOut);
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
      io.to(socket.id).emit("suggest", suggest_result, moveOut);
    }
  });

  socket.on("move_group", (group, row, col) => {
    let current_group = game_match.filter((x) => x.code == group)[0];
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
  });

  socket.on("move_out_group", (group, res) => {
    let current_group = game_match.filter((x) => x.code == group)[0];
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
    let current_group = game_match.filter((x) => x.code == group)[0];
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

  });

  socket.on("disconnect", () => {
    console.log(socket.id + " leave");
    game_match.forEach((item,index)=>{
        console.log(item,index);
        if(item.first==socket.id){
          item.first == '';
        }
        else if(item.second==socket.id){
          item.second = '';
        }
    });
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
  console.log(current_group["martrix"]);
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
    current_group[current_group["firstStep"] ? "first" : "second"],
    current_group["gameScore"][player]
  );
}

function Min() {}

function Max() {}

server.listen(PORT, function () {
  console.log("Start server port 5000...");
});

module.exports = app;
