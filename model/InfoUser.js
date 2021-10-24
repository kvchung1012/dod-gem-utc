function InforGame() {
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
}