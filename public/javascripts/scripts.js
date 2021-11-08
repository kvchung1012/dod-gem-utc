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

socket.on("suggest", (arr, row, col, moveOut) => {
  SuggestNextStep(arr);
  if (moveOut) {
    $(".block[data-row=" + row + "][data-col=" + col + "]").children('div').addClass('active');
  }
});

socket.on("join_status", (status, msg,turn,row) => {
  swal(msg);
  SetUp(row);
  if (status) {
    $(".my-name,.competitor-name").removeClass("active");
    if(turn==1){
      $(".my-name").addClass("active");
    }
    else
      $(".competitor-name").addClass("active");
  }
});

socket.on("move_item", (turn, turnCurrent, old_row, old_col, row, col) => {
  $(".block").removeClass("suggest"); // xóa đi các class gợi ý
  $(".move-out").removeClass("active"); // xóa đi các class gợi ý
  $(".move-out-stand").removeClass("active"); // xóa đi các class gợi ý

  // remove click
  $(".block[data-row=" + old_row + "][data-col=" + old_col + "]").html(""); // xóa đi images
  $(".block[data-row=" + old_row + "][data-col=" + old_col + "]").click(
    function () {
      // bind xự kiện onclick
      Choose(this);
    }
  );

  $(".block[data-row=" + row + "][data-col=" + col + "]").prop('onclick', null).off('click');
  $(".block[data-row=" + row + "][data-col=" + col + "]").append(
    `${turn===1?'<div class="move-out" onclick="MoveOut()"></div>':'<div class="move-out-stand" onclick="MoveOut()"></div>'}
        <img src="${turn === 1 ? "./images/quan-do.png" : "./images/quan-den.png"}" 
        alt="" class="w-100 my-item" onclick="StepCurrent(this)">`
  );

  // cập nhật lượt chơi
  $(".my-name,.competitor-name").removeClass("active");
  if (turnCurrent == 1) {
    $(".my-name").addClass("active");
  } else {
    $(".competitor-name").addClass("active");
  }
});

socket.on("move_item_out", (turnCurrent, row, col) => {
  $(".block").removeClass("suggest"); // xóa đi các class gợi ý
  // remove click
  $(".block[data-row=" + row + "][data-col=" + col + "]").html(""); // xóa đi images
  $(".block[data-row=" + row + "][data-col=" + col + "]").click(function () {
    Choose(this);
  })
  // cập nhật lượt chơi
  $(".my-name,.competitor-name").removeClass("active");
  if (turnCurrent) {
    $(".my-name").addClass("active");
  } else {
    $(".competitor-name").addClass("active");
  }
});

socket.on("end_game", (row, turnCurrent, id, score) => {
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


socket.on("end_game_bot", (row, score, humanWin) => {
  if (humanWin) {
    swal({
      title: "Good job!",
      text: "Chúc mừng bạn !",
      icon: "success",
    });
  }
  else {
    swal({
      title: "Noob!",
      text: "Bạn hơi non !",
      icon: "warning",
    });
  }

  $('.point1').html('');
  $('.my-point').html(score.human);
  $('.competitor-point').html(score.bot);
  SetUp(row);
});


socket.on('nogroup', msg => {
  swal("người chơi đã thoát nhóm mời bạn bấm nút thoát để làm lại cuộc đời");
})

socket.on('resize', row => {
  SetUp(row);
})


socket.on('warning', msg => {
  swal(msg);
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
  $(".block").children('div').removeClass('active');
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
        row_single += ` <div class="block col-sm box" data-col="${j}" data-row="${i}" onclick="Choose(this)">
                                            </div>`;
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
function ReSize() {
  $('input[name=Size]').on('change', function () {
    socket.emit("change_size", group, $(this).val());
  })
}

function MoveOut() {
  if (group != '')
    socket.emit("move_out_group", group);
  else
    socket.emit("move");
}