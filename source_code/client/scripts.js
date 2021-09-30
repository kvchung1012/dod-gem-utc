// setup default game

const FIRST_USER = 1;  // quy ước value của người 1
const SECOND_USER = 2; // // quy ước value của người 2
var isMyStep = true;  // true là người một có thể đi
var firstCanMove = false;  // kiểm tra xem có được di chuyển không
var secondCanMove = false; // same
var first_pick = {row:-1,col:-1}; // vị trí pick hiện tại của người 1
var second_pick = {row:-1,col:-1}; // vị trí pick hiện tại của người 2
var matrix = [[0,FIRST_USER,FIRST_USER,FIRST_USER],[SECOND_USER,0,0,0],[SECOND_USER,0,0,0],[SECOND_USER,0,0,0]];  // khởi tạo ma trận
var suggest = []; // mảng vị trí các nước đi gợi ý
var row_number = 3; // só lượng các cột và hàng
var first_point = 0; // điểm trong 1 game  3 điểm thì win
var second_point = 0; // điểm trong 1 game 3 điểm thì win
var gameScore = {
    first:0,
    second : 0
}
ChooseSize();
SetHeight();
SetUp(row_number);

// chọn size cho game
function ChooseSize() {
    $("input[name=Size]").change(function () {
      row_number = $("input[name=Size]:checked").val();
      SetUp(row_number);
      StepCurrent();
    });
}

// set giao diện chiều cao các cột
function SetHeight() {
  var cw = $(".block").width();
  $(".block").css({ height: cw + "px" });
}

// setup giao diện + ma trận
function SetUp(row_number) {
  // resize martrix
  matrix = [];
  for(let i = 0;i<=row_number;i++){
    let arr  = [];  
    for(let j= 0;j<=row_number;j++){
         if(i==0){
            if(j==0) arr.push(0);
            else arr.push(FIRST_USER);
         }
         else{
             if(j==0)arr.push(SECOND_USER);
             else arr.push(0);
         }
      }
      matrix.push(arr);
  }

  // reset UI;
  let row = ``;
  for (let i = row_number; i >= 0; i--) {
    let row_single = `<div class="list-block row" data-row="${i}">`;
    for (let j = 0; j <= row_number; j++) {
      if (i == 0 && j > 0) {
        row_single += ` <div class="block col-sm box" data-col="${j}" data-row="${i}">
                                                  <img src="./image/quan-do.png" alt="" class="w-100 my-item" onclick="StepCurrent(this)">
                                            </div>`;
      } else if (i > 0 && j == 0) {
        row_single += ` <div class="block col-sm box" data-col="${j}" data-row="${i}">
                                                  <img src="./image/quan-den.png" alt="" class="w-100" onclick="StepCurrent(this)">
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

// khi game hoàn thành
function ResetGame(){
   SetUp(row_number);
   first_point = 0;
   second_point = 0;
   suggest = []; 
   firstCanMove = false;
   secondCanMove = false;
   first_pick = {row:-1,col:-1};
   second_pick = {row:-1,col:-1};
}


// logic game in hear


// click vào quân cờ để gợi ý
function StepCurrent(e){ 
        // vị trí quân cờ được click
        let current_row = parseInt($(e).parent('div').attr('data-row'));
        let current_col = parseInt($(e).parent('div').attr('data-col'));
        
        // đến lượt người chơi thứ 1
        if(isMyStep && matrix[current_row][current_col] == FIRST_USER){
            
           // chọn quân cờ đc đi thì mới di chuyển đc
            firstCanMove = true;
            first_pick ={
              row : current_row,
              col : current_col
            }

            // các bước gợi ý tiếp theo
            suggest = [[current_row + 1,current_col],[current_row,current_col + 1],[current_row,current_col - 1]];
            // trường hợp ở ngoài cùng bên phải
            if(current_col==matrix.length-1)
              suggest = [[current_row + 1,current_col],[current_row,current_col - 1]];


            // trường hợp đi ra ngoài  
            if(current_row==matrix.length-1){
                var res = confirm('Bạn có muốn đi ra ngoài không?');
                if(res){
                    matrix[current_row][current_col] = 0;
                    $(e).remove();
                    first_point++;
                    // trường hợp win trò chơi
                    if(first_point==3){
                      alert("Chúc mừng người chơi số 1 win");
                      UpdateGameScore(FIRST_USER);
                      ResetGame();
                    }
                    SwitchUser();
                    return;
                }
            }
            SuggestNextStep(suggest);
        }
        // bước của người chơi thứ 2
        else if(!isMyStep && matrix[current_row][current_col]== SECOND_USER){
            secondCanMove = true;
            second_pick ={
              row : current_row,
              col : current_col
            }
            suggest = [[current_row,current_col+1],[current_row+1,current_col],[current_row-1,current_col]];
            if(current_row==matrix.length-1)  // trường hợp ở dòng trên cùng
              suggest = [[current_row,current_col+1],[current_row-1,current_col]];


              if(current_col==matrix.length-1){
                var res = confirm('Bạn có muốn đi ra ngoài không?');
                if(res){
                    matrix[current_row][current_col] = 0;
                    $(e).remove();
                    second_point++;
                    if(second_pick==3){
                      alert("Chúc mừng người chơi số 2 win");
                      UpdateGameScore(SECOND_USER);
                      ResetGame();
                    }
                    SwitchUser();
                    return;
                }
            }  
            SuggestNextStep(suggest);
        }
}

// hiển thị các nước đi tiếp theo
function SuggestNextStep(arr){
    $('.block').removeClass('suggest');
    arr.forEach(element => {
        let i = element[0];
        let j= element[1];
        let value = matrix[i][j];
        if(value==0){
            $('.block[data-row='+i+'][data-col='+j+']').addClass('suggest');
        }
    });
}

// click vào vị trí tiếp theo để di chuyển
async function Choose(e){
    let next_row = $(e).attr('data-row');
    let next_col = $(e).attr('data-col');
    if(isMyStep && firstCanMove){  // lượt người chơi thứ 1
      if(first_pick.row > -1 && first_pick.col > -1 && await CanMove(next_row,next_col)){
        await Move(first_pick.row,first_pick.col,next_row,next_col);
        firstCanMove = false;
      }
    }
    else if(!isMyStep && secondCanMove){  // lượt người chơi thứ 2
      if(second_pick.row >-1 && second_pick.col > -1 && await CanMove(next_row,next_col)){
        await Move(second_pick.row,second_pick.col,next_row,next_col);
        secondCanMove = false;
      }
    }
}

// di chuyển
async function Move(current_row,current_col, next_row,next_col){
        matrix[current_row][current_col] = 0;
        matrix[next_row][next_col] = isMyStep?FIRST_USER:SECOND_USER;
        $('.block').removeClass('suggest');  // xóa đi các class gợi ý
        $('.block[data-row='+current_row+'][data-col='+current_col+']').html('');  // xóa đi image
        $('.block[data-row='+current_row+'][data-col='+current_col+']').click(function(){  // bind xự kiện onclick
          Choose(this);
        });
        $('.block[data-row='+next_row+'][data-col='+next_col+']').append(isMyStep?'<img src="./image/quan-do.png" alt="" class="w-100 my-item" onclick="StepCurrent(this)">':'<img src="./image/quan-den.png" alt="" class="w-100 my-item" onclick="StepCurrent(this)">');
        // update color user
        SwitchUser();
        
}

// kiểm tra có thể di chuyển
async function CanMove(next_row,next_col){
    let check = false;
    suggest.forEach(x=>{
      if(x[0] == next_row && x[1]==next_col && matrix[next_row][next_col]==0 )
       check = true;
    })
    return check;
}


function SwitchUser(){
      isMyStep = !isMyStep;
      if(isMyStep){
        $('.my-name').addClass('active');
        $('.competitor-name').removeClass('active');
      }
      else{
        $('.my-name').removeClass('active');
        $('.competitor-name').addClass('active');
      }
}


function UpdateGameScore(who){
    if(who==FIRST_USER){
       gameScore.first++;
    }
    else{
      gameScore.second++;
    }

    $('.my-point').text(gameScore.first);
    $('.competitor-point').text(gameScore.second);
}