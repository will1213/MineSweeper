"use strict";

let MSGame = (function(){

  // private constants
  const STATE_HIDDEN = "hidden";
  const STATE_SHOWN = "shown";
  const STATE_MARKED = "marked";

  function array2d( nrows, ncols, val) {
    const res = [];
    for( let row = 0 ; row < nrows ; row ++) {
      res[row] = [];
      for( let col = 0 ; col < ncols ; col ++)
        res[row][col] = val(row,col);
    }
    return res;
  }

  // returns random integer in range [min, max]
  function rndInt(min, max) {
    [min,max] = [Math.ceil(min), Math.floor(max)]
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  class _MSGame {
    constructor() {
      this.init(8,10,10); // easy
    }

    validCoord(row, col) {
      return row >= 0 && row < this.nrows && col >= 0 && col < this.ncols;
    }

    init(nrows, ncols, nmines) {
      this.nrows = nrows;
      this.ncols = ncols;
      this.nmines = nmines;
      this.nmarked = 0;
      this.nuncovered = 0;
      this.exploded = false;
      // create an array
      this.arr = array2d(
        nrows, ncols,
        () => ({mine: false, state: STATE_HIDDEN, count: 0}));
    }

    count(row,col) {
      const c = (r,c) =>
            (this.validCoord(r,c) && this.arr[r][c].mine ? 1 : 0);
      let res = 0;
      for( let dr = -1 ; dr <= 1 ; dr ++ )
        for( let dc = -1 ; dc <= 1 ; dc ++ )
          res += c(row+dr,col+dc);
      return res;
    }

    myCount(row,col){
            const c = (r,c) =>
            (this.validCoord(r,c) && this.arr[r][c].mine ? 1 : 0);
      let res = 0;
      for( let dr = -1 ; dr <= 1 ; dr ++ )
        for( let dc = -1 ; dc <= 1 ; dc ++ )
          res += c(row+dr,col+dc);
      return res;
      
    }
    sprinkleMines(row, col) {
        // prepare a list of allowed coordinates for mine placement

      let allowed = [];
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(Math.abs(row-r) > 2 || Math.abs(col-c) > 2)
            allowed.push([r,c]);
        }
      }
      this.nmines = Math.min(this.nmines, allowed.length);
      for( let i = 0 ; i < this.nmines ; i ++ ) {
        let j = rndInt(i, allowed.length-1);
        [allowed[i], allowed[j]] = [allowed[j], allowed[i]];
        let [r,c] = allowed[i];
        this.arr[r][c].mine = true;
      }
      // erase any marks (in case user placed them) and update counts
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(this.arr[r][c].state == STATE_MARKED)
            this.arr[r][c].state = STATE_HIDDEN;
          
          this.arr[r][c].count = this.myCount(r,c);
          //this.arr[r][c].count = this.count(r,c);
        }
      }
      let mines = []; let counts = [];
      for(let row = 0 ; row < this.nrows ; row ++ ) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].mine ? "B" : ".";
        }
        s += "  |  ";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].count.toString();
        }
        mines[row] = s;
      }
      console.log("Mines and counts after sprinkling:");
      console.log(mines.join("\n"), "\n");

    }

    // uncovers a cell at a given coordinate
    // this is the 'left-click' functionality

    uncover(row, col) {
      console.log("uncover", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if this is the very first move, populate the mines, but make
      // sure the current cell does not get a mine
      if( this.nuncovered === 0)
        this.sprinkleMines(row, col);
      // if cell is not hidden, ignore this move
      if( this.arr[row][col].state !== STATE_HIDDEN) return false;
      // floodfill all 0-count cells
      const ff = (r,c) => {
        if( ! this.validCoord(r,c)) return;
        if( this.arr[r][c].state !== STATE_HIDDEN) return;
        this.arr[r][c].state = STATE_SHOWN;
        this.nuncovered ++;
        if( this.arr[r][c].count !== 0) return;
        ff(r-1,c-1);ff(r-1,c);ff(r-1,c+1);
        ff(r  ,c-1);         ;ff(r  ,c+1);
        ff(r+1,c-1);ff(r+1,c);ff(r+1,c+1);
      };
      ff(row,col);
      // have we hit a mine?
      if( this.arr[row][col].mine) {
        this.exploded = true;
      }
      return true;
    }
    // puts a flag on a cell
    // this is the 'right-click' or 'long-tap' functionality
    mark(row, col) {
      console.log("mark", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if cell already uncovered, refuse this
      console.log("marking previous state=", this.arr[row][col].state);
      if( this.arr[row][col].state === STATE_SHOWN) return false;
      // accept the move and flip the marked status
      this.nmarked += this.arr[row][col].state == STATE_MARKED ? -1 : 1;
      this.arr[row][col].state = this.arr[row][col].state == STATE_MARKED ?
        STATE_HIDDEN : STATE_MARKED;
      return true;
    }
    // returns array of strings representing the rendering of the board
    //      "H" = hidden cell - no bomb
    //      "F" = hidden cell with a mark / flag
    //      "M" = uncovered mine (game should be over now)
    // '0'..'9' = number of mines in adjacent cells
    getRendering() {
      const res = [];
      for( let row = 0 ; row < this.nrows ; row ++) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          let a = this.arr[row][col];
          if( this.exploded && a.mine) s += "M";
          else if( a.state === STATE_HIDDEN) s += "H";
          else if( a.state === STATE_MARKED) s += "F";
          else if( a.mine) s += "M";
          else s += a.count.toString();
        }
        res[row] = s;
      }
      return res;
    }
    getStatus() {
      let done = this.exploded ||
          this.nuncovered === this.nrows * this.ncols - this.nmines;
      return {
        done: done,
        exploded: this.exploded,
        nrows: this.nrows,
        ncols: this.ncols,
        nmarked: this.nmarked,
        nuncovered: this.nuncovered,
        nmines: this.nmines
      }
    }
    
  }
    


  return _MSGame;

})();
/**
 * updates DOM to reflect current state
 * - hides unnecessary cards by setting their display: none
 * - adds "flipped" class to cards that were flipped
 * 
 * @param {object} game 
 */
function render(game) {
  const grid = document.querySelector(".grid");
  grid.style.gridTemplateColumns = `repeat(${game.ncols}, 1fr)`;
  let answer = false;
  for( let i = 0 ; i < grid.children.length ; i ++) {
    const field = grid.children[i];
    const ind = Number(field.getAttribute("data-fieldInd"));
    const col = ind % game.ncols;
    const row = Math.floor(ind / game.ncols);
    if( ind >= game.nrows * game.ncols) {
      field.style.display = "none";
    }
    else {

      if(i%game.ncols === 0 )answer = !answer;
      if(answer){
        if(i%2 === 0){
          field.classList.add("evenfield");
          field.classList.remove("oddfield");
        }
        else{
          field.classList.add("oddfield");
          field.classList.remove("evenfield");
        }
      }
      else{
        if(i%2 === 0){
          field.classList.add("oddfield");
          field.classList.remove("evenfield");
        }
        else{
          field.classList.add("evenfield");
          field.classList.remove("oddfield");
        }
      }


      field.style.display = "block";
      if(game.arr[row][col].state==="shown"){
      let count = game.arr[row][col].count;
      if(count > 0 && !game.arr[row][col].mine){
        field.innerHTML = count.toString();
      }
        if(field.classList.contains("oddfield")){
        field.classList.add("oddshown");
        }else{
        field.classList.add("evenshown");
        }
      }
      else{
      field.classList.remove("oddshown");
      field.classList.remove("evenshown");
      }
      if(game.arr[row][col].state==="marked"){   
      field.classList.add("marked")
      }
      else{
      field.classList.remove("marked");
      
  }
      //if(s.arr[row][col]==="shown" ? field.classList.add("shown") : field.classList.remove("shown"));
      //if(s.arr[row][col]==="hidden" ? field.classList.add("hidden") : field.classList.remove("hidden"));
      //if(s.arr[row][col]==="marked" ? field.classList.add("marked") : field.classList.remove("marked"));
    }
  }
  document.querySelectorAll(".remain").forEach(
    (e)=> {
      e.textContent = String(game.nmines - game.nmarked);
    });

  }
/**
 * creates enough cards for largest board (9x9)
 * registers callbacks for cards
 * 
 * @param {state} s 
 */
function prepare_dom(s) {
  const grid = document.querySelector(".grid");
  const nFields = 20 * 24 ; // max grid size
  for( let i = 0 ; i < nFields ; i ++) {
    const Field = document.createElement("div");
    Field.className="field";
    Field.setAttribute("data-fieldInd", i);

    let JField0 = $(Field);
    let JField = $(Field);
    /*
    Field.on("click", ()=>{
      field_click_cb( s, Field, i);
    });
  */



   JField0.on("click", ()=>{
    field_click_cb( s, Field, i);
  });

    Field.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      field_hold_cb( s, Field, i);
    }, false);

/*
  JField0.on("contextmenu", function(){
    field_hold_cb( s, Field, i);
  });
  */
 /*
    JField0.on("taphold", function(){
      console.log("im in tapppppppppppppp");
      field_hold_cb( s, Field, i);
    });
*/
    grid.appendChild(Field);
  }
}

/**
 * callback for clicking a field
 * - toggle surrounding elements
 * - check for winning condition
 * @param {state} game 
 * @param {HTMLElement} field_div 
 * @param {number} ind 
 */
function field_click_cb(game, field_div, ind) {
  const col = ind % game.ncols;
  const row = Math.floor(ind / game.ncols);

  //field_div.classList.add("shown");
  game.uncover(row, col);
  console.log(game.getRendering().join("\n"));
  console.log(game.getStatus());
  render(game);
  // check if we won and activate overlay if we did

  if( game.exploded ||
    game.nuncovered === game.nrows * game.ncols - game.nmines) {
    clearInterval(IntervalID);
    if(game.exploded){
      document.querySelector("#overlayin p").innerHTML = "YOU LOST!!!!";
      document.querySelector("#overlay").classList.toggle("active");
    }else{
      document.querySelector("#overlayin p").innerHTML = "Congratulations, you won!!!";
      document.querySelector("#overlay").classList.toggle("active");
    }

  }

}
/**
 * callback for clicking a field
 * - toggle surrounding elements
 * - check for winning condition
 * @param {state} game 
 * @param {HTMLElement} field_div 
 * @param {number} ind 
 */
function field_hold_cb(game, field_div, ind) {
  const col = ind % game.ncols;
  const row = Math.floor(ind / game.ncols);

  //field_div.classList.add("shown");
  game.mark(row, col);
  console.log(game.getRendering().join("\n"));
  console.log(game.getStatus());
  render(game);
  // check if we won and activate overlay if we did

 /* if( s.onoff.reduce((res,l)=>res && !l, true)) {
    document.querySelector("#overlay").classList.toggle("active");
  }*
  clickSound.play();*/
}
function createNew(game,rows, cols, mines) {


  game.init(rows, cols, mines);
  console.log(game.nrows,game.ncols,game.nmines);

  const grid = document.querySelector(".grid");
  for( let i = 0 ; i < grid.children.length ; i ++) {
    const field = grid.children[i];
    field.innerHTML="";
  }
  render(game);

  console.log(game.getRendering().join("\n"));
  console.log(game.getStatus());
  clearInterval(IntervalID);
  displayTime();
  
}
var IntervalID;

function displayTime(){

  let count = 0;
  IntervalID = setInterval( () => {
    $(".time").text(count.toString());
    count++;
  }, 1000);

}

function start(){

  let game = new MSGame();

  let html = document.querySelector("html");
    console.log("Your render area:", html.clientWidth, "x", html.clientHeight)
  
    // register callbacks for buttons
   document.querySelectorAll(".dropdown-item").forEach((button) =>{
      let rows = null;
      let cols = null;
      let mines = null;
      let difficulty = null;
      [rows,cols] = button.getAttribute("data-size").split("x").map(s=>Number(s));
      difficulty = button.getAttribute("data-difficulty");
      mines = button.getAttribute("data-mine");

       

      button.addEventListener("click", ()=>{createNew(game,rows,cols,mines)});  
      button.addEventListener("click", ()=>{
        document.getElementById("changed").innerHTML = `${difficulty}`;
        document.getElementById("changed").setAttribute("data-size", rows+"x"+cols);
        document.getElementById("changed").setAttribute("data-mine", mines);
        document.getElementById("changed").setAttribute("data-difficulty", difficulty);
      });
    });

    document.querySelector("#overlay").addEventListener("click", () => {

      document.querySelector("#overlay").classList.remove("active");
      let rows = null;
      let cols = null;
      let mines = null;
      let difficulty = null;
      [rows,cols] = document.getElementById("changed").getAttribute("data-size").split("x").map(s=>Number(s));
      difficulty = document.getElementById("changed").getAttribute("data-difficulty");
      mines = document.getElementById("changed").getAttribute("data-mine");
      createNew(game,rows,cols,mines);
    });

    prepare_dom(game);
    createNew(game,8,10,10);

  
}

window.addEventListener("DOMContentLoaded", start);
/*
let game = new MSGame();
  game.init(8, 10, 10);
  console.log(game.getRendering().join("\n"));
  console.log(game.getStatus());
  


  game.uncover(2,5);
  console.log(game.getRendering().join("\n"));
  console.log(game.getStatus());
  
  game.uncover(5,5);
  console.log(game.getRendering().join("\n"));
  console.log(game.getStatus());
  
  game.mark(4,5);
  console.log(game.getRendering().join("\n"));
  console.log(game.getStatus());
 

  game.init(14, 18, 40);
  console.log(game.getRendering().join("\n"));
  console.log(game.getStatus());

  game.uncover(2,5);
  console.log(game.getRendering().join("\n"));
  console.log(game.getStatus());
  
  game.uncover(5,5);
  console.log(game.getRendering().join("\n"));
  console.log(game.getStatus());
  
  game.mark(4,5);
  console.log(game.getRendering().join("\n"));
  console.log(game.getStatus());

  console.log("end");*/