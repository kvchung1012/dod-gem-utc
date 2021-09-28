// setup default game

const FIRST_USER = 1;
const SECOND_USER = 2;
var isMyStep = true;  // là người một có thể đi
var firstCanMove = false;
var secondCanMove = false;
var first_pick = {row:-1,col:-1};
var second_pick = {row:-1,col:-1};
var matrix = [[0,FIRST_USER,FIRST_USER,FIRST_USER],[SECOND_USER,0,0,0],[SECOND_USER,0,0,0],[SECOND_USER,0,0,0]];
var suggest = [];
ChooseSize();
SetHeight();
SetUp(3);
function ChooseSize() {
    $("input[name=Size]").change(function () {
      let row_number = $("input[name=Size]:checked").val();
      SetUp(row_number);

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
      StepCurrent();
    });
}

function SetHeight() {
  var cw = $(".block").width();
  $(".block").css({ height: cw + "px" });
}

function SetUp(row_number) {
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


// logic game in hear

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
            if(current_row==matrix.length-1)
              suggest = [[current_row,current_col+1],[current_row-1,current_col]];

            SuggestNextStep(suggest);
        }
}


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


async function Choose(e){
    let next_row = $(e).attr('data-row');
    let next_col = $(e).attr('data-col');
    if(isMyStep && firstCanMove){  // lượt người chơi thứ 1
      if(first_pick.row > -1 && first_pick.col > -1 && matrix[next_row][next_col]==0){
        await Move(first_pick.row,first_pick.col,next_row,next_col);
        firstCanMove = false;
      }
    }
    else if(!isMyStep && secondCanMove){  // lượt người chơi thứ 2
      if(second_pick.row >-1 && second_pick.col > -1 && matrix[next_row][next_col]==0){
        await Move(second_pick.row,second_pick.col,next_row,next_col);
        secondCanMove = false;
      }
    }
}


async function Move(current_row,current_col, next_row,next_col){
   let check = await CanMove(next_row,next_col);
   if(check){
        matrix[current_row][current_col] = 0;
        matrix[next_row][next_col] = isMyStep?FIRST_USER:SECOND_USER;
        $('.block').removeClass('suggest');  // xóa đi các class gợi ý
        $('.block[data-row='+current_row+'][data-col='+current_col+']').html('');  // xóa đi image
        $('.block[data-row='+current_row+'][data-col='+current_col+']').click(function(){  // bind xự kiện onclick
          Choose(this);
        });
        $('.block[data-row='+next_row+'][data-col='+next_col+']').append(isMyStep?'<img src="./image/quan-do.png" alt="" class="w-100 my-item" onclick="StepCurrent(this)">':'<img src="./image/quan-den.png" alt="" class="w-100 my-item" onclick="StepCurrent(this)">');
        isMyStep = !isMyStep;
        // update color user
        if(isMyStep){
            $('.my-name').addClass('active');
            $('.competitor-name').removeClass('active');
        }
        else{
          $('.my-name').removeClass('active');
          $('.competitor-name').addClass('active');
        }
   }
}


async function CanMove(next_row,next_col){
    let check = false;
    suggest.forEach(x=>{
      if(x[0] == next_row && x[1]==next_col)
       check = true;
    })
    return check;
}