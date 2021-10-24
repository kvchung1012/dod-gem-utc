// config game
var config = {};
var group = "";
// socket events
const socket = io();
console.log(socket.id);
socket.on("startUpGame", (setUp) => {
  config = setUp;
  SetUp(setUp.row);
});

socket.on("suggest", (arr, moveOut) => {
  SuggestNextStep(arr);
  if (moveOut) {
    let res = confirm("go out !");
    if (res) {
      socket.emit("move_out_group", group, res);
    }
  }
});

socket.on("join_status", (turnCurrent, msg) => {
  swal(msg);
  $(".my-name,.competitor-name").removeClass("active");
  $(".my-name").addClass("active");
});

socket.on("move_item", (turn, turnCurrent, old_row, old_col, row, col) => {
  $(".block").removeClass("suggest"); // xóa đi các class gợi ý
  // remove click
  $(".block[data-row=" + old_row + "][data-col=" + old_col + "]").html(""); // xóa đi images
  $(".block[data-row=" + old_row + "][data-col=" + old_col + "]").click(
    function () {
      // bind xự kiện onclick
      Choose(this);
    }
  );

  $(".block[data-row=" + row + "][data-col=" + col + "]").click(function () {
    // bind xự kiện onclick
    Choose(this);
  });
  $(".block[data-row=" + row + "][data-col=" + col + "]").append(
    `<img src="${
      turn === 1 ? "./images/quan-do.png" : "./images/quan-den.png"
    }" alt="" class="w-100 my-item" onclick="StepCurrent(this)">`
  );

  // cập nhật lượt chơi
  $(".my-name,.competitor-name").removeClass("active");
  console.log(turnCurrent,socket.id);
  if (turnCurrent) {
    $(".my-name").addClass("active");
    console.log("my");
  } else {
    $(".competitor-name").addClass("active");
    console.log("you");
  }
});

socket.on("move_item_out", (turnCurrent, row, col) => {
  $(".block").removeClass("suggest"); // xóa đi các class gợi ý
  // remove click
  $(".block[data-row=" + row + "][data-col=" + col + "]").html(""); // xóa đi images

  // cập nhật lượt chơi
  $(".my-name,.competitor-name").removeClass("active");
  if (turnCurrent) {
    $(".my-name").addClass("active");
  } else {
    $(".competitor-name").addClass("active");
  }
});

socket.on("end_game", (row,turnCurrent, id,score) => {
  $(".my-name,.competitor-name").removeClass("active");
  if (id === socket.id) {
    swal({
      title: "Good job!",
      text: "Ghê ghê!",
      icon: "success",
    });
    $('.my-point').html('');
    $('.my-point').html(score);
  } else {
    swal({
      title: "Good job!",
      text: "Bạn hơi non !",
      icon: "warning",
    });
    $('.competitor-point').html('');
    $('.competitor-point').html(score);
  }

  $(".my-name,.competitor-name").removeClass("active");
  if (turnCurrent) {
    $(".my-name").addClass("active");
  } else {
    $(".competitor-name").addClass("active");
  }

  SetUp(row);
});


socket.on('resize',row=>{
  SetUp(row);
})

// function client

// // click vào quân cờ để gợi ý
function StepCurrent(e) {
  // vị trí quân cờ được click
  let current_row = parseInt($(e).parent("div").attr("data-row"));
  let current_col = parseInt($(e).parent("div").attr("data-col"));
  if (group === "") socket.emit("req_suggest", current_row, current_col);
  else socket.emit("req_suggest_group", group, current_row, current_col);
}

// // hiển thị các nước đi tiếp theo
function SuggestNextStep(arr) {
  $(".block").removeClass("suggest");
  arr.forEach((element) => {
    let i = element["row"];
    let j = element["col"];
    $(".block[data-row=" + i + "][data-col=" + j + "]").addClass("suggest");
  });
}

function Choose(e) {
  let next_row = $(e).attr("data-row");
  let next_col = $(e).attr("data-col");
  if (group === "") socket.emit("move", next_row, next_col);
  else socket.emit("move_group", group, next_row, next_col);
}

// set giao diện chiều cao các cột
function SetHeight() {
  var cw = $(".block").width();
  $(".block").css({ height: cw + "px" });
}

// // setup giao diện + ma trận
function SetUp(row_number) {
  // reset UI;
  let row = ``;
  for (let i = row_number; i >= 0; i--) {
    let row_single = `<div class="list-block row" data-row="${i}">`;
    for (let j = 0; j <= row_number; j++) {
      if (i == 0 && j > 0) {
        row_single += ` <div class="block col-sm box" data-col="${j}" data-row="${i}">
                                                  <img src="./images/quan-do.png" alt="" class="w-100 my-item" onclick="StepCurrent(this)">
                                            </div>`;
      } else if (i > 0 && j == 0) {
        row_single += ` <div class="block col-sm box" data-col="${j}" data-row="${i}">
                                                  <img src="./images/quan-den.png" alt="" class="w-100" onclick="StepCurrent(this)">
                                            </div>`;
      } else {
        row_single += ` <div class="block col-sm box" data-col="${j}" data-row="${i}" onclick="Choose(this)"></div>`;
      }
    }
    row_single += `</div>`;
    row += row_single;
  }
  $(".game-table").html("");
  $(".game-table").prepend(row);
  SetHeight();
}

function JoinGroup(e) {
  group = $(e).val();
  socket.emit("join_group", $(e).val());
  $(e).prop("readonly", true);
}

ReSize();
function  ReSize() {
  $('input[name=Size]').on('change',function () {
    socket.emit("change_size",group,$(this).val());
  })
}