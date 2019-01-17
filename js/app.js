let g_sticky_wrap_element = document.getElementById('sticky_wrap');

let g_sticky_list = [];

const g_STICKY_LS = "sticky_local_storage";

//고정 된 스티키 너비와 높이
const g_STICKY_WIDTH = 250;
const g_TOP_NAV_HEIGHT = 32;
const g_STICKY_HEIGHT = 300 + g_TOP_NAV_HEIGHT;

//스티키 드래그 시 보정 값 x, y
let g_correct_sticky_left = 0;
let g_correct_sticky_top = 0;

//현재 드래그 중인 스티키의 div. 
let g_drag_sticky_element;

/**
 * @@brief 해당 id의 StickyObject를 반환한다.
 * @param {*} id 
 */
function GetStickyObjWithId(id){

    for( let idx = 0; idx < g_sticky_list.length ; idx++){
    
        let cur_sticky_obj = g_sticky_list[idx];
        if( id === cur_sticky_obj._id ){

            return cur_sticky_obj;
        }
    }
}
/**
 * @@brief 해당 sticky_div와 매칭되는 StickyObject를 반환한다.
 * @param {*} sticky_div 
 */
function GetStickyObjWithStickyDiv(sticky_div){

    return GetStickyObjWithId(sticky_div.id);
}

/**
 * @@brief 스티키 드래그 이벤트. 스티키 위치를 마우스 드래그에 따라 이동하게 만든다.
 * @param {*} event 이벤트 오브젝트
 */
function MoveDragWithSticky(event){

    const event_obj = event;
    const cur_sticky_left = parseInt(event_obj.clientX + g_correct_sticky_left);
    const cur_sticky_top = parseInt(event_obj.clientY + g_correct_sticky_top);

    g_drag_sticky_element.style.left = cur_sticky_left +"px";
    g_drag_sticky_element.style.top = cur_sticky_top +"px";

    console.log('zindex='+ g_drag_sticky_element.style.zIndex);

    return false;
}

/**
 * @@brief 스티키 드래그 이벤트가 끝날 때 호출된다. 드래그한 스티키의 z-index를 겹치는 스티키에 따라 재 부여한다.
 */
function StopDragWithSticky(){

    g_drag_sticky_element.style.zIndex=0;

    document.onmousemove = null;
    document.onmouseup = null;

    const cur_sticky_obj = GetStickyObjWithStickyDiv(g_drag_sticky_element);
    cur_sticky_obj.SetXY( parseInt(g_drag_sticky_element.style.left, 10) , parseInt(g_drag_sticky_element.style.top, 10) );

    PutStickyWithZIndex(cur_sticky_obj);
}

/**
 * @@brief 스티키 드래그 이벤트가 시작 할 때 호출한다.
 * @param {*} event 이벤트 오브젝트 
 */
function StartDragWithSticky(event){


    g_drag_sticky_element = event.target.parentNode;
    const event_obj = event;
    g_correct_sticky_left = parseInt(g_drag_sticky_element.offsetLeft) - event_obj.clientX;
    g_correct_sticky_top =  parseInt(g_drag_sticky_element.offsetTop) - event_obj.clientY;

    document.onmousemove = MoveDragWithSticky;
    document.onmouseup = StopDragWithSticky;

    //ZIndex조정
    const cur_sticky_obj = GetStickyObjWithStickyDiv( g_drag_sticky_element);
    
    g_drag_sticky_element.style.zIndex=999;
    RemoveStickyWithZIndex(cur_sticky_obj);

    event_obj.preventDefault(); 
}

/**
 * @@brief 최소한 메모 가능한 기능 클래스.
 * @@brief id 내용 기록, 시작 좌표, 메모 내용이 담겨있다.
 */
class Memo{

    constructor(id, top, left, text){

        //클래스 속성 설정.
        this._id = id;
        this._top = top;
        this._left =left;
        this._text = text;
    }
}

/**
 * @@brief 메모 + 스티키 기능 클래스.
 * @@brief 기존 메모에 zIndex를 추가해 스티키 간에 겹치는 기능과 생성 날짜 정보가 담겨있다.
 */
class Sticky extends Memo{

    constructor(id, top, left, text, zIndex, isUsing, date){

        //클래스 속성 설정.
        super(`${id}`, top, left, text);
        this._zIndex = zIndex;
        this._isUsing = isUsing;
        this._sticky_element = null;
        this._textarea_element = null;
        this._date = date;

        //스티키 생성 및 부모 DOM에 삽입
        this.CreateStickyElement(id);

        //id 등록 및 클래스에 stikcy div 등록.
        this.SetId(id);

        //sticky 위치 및 z-index 설정.
        this.SetXY(left, top);
        this.SetZIndex(zIndex);

        //sticky 메모 초기화 및 값 설정.
        this.InitMemo();
        this.SetMemo(text);

        //이벤트 등록
        this.AddStickyEvent();
    }
    
    /**
     * 스티키 관련 이벤트를 등록한다.
     */
    AddStickyEvent(){

    //드래그 이벤트 등록
    const sticky_element = g_sticky_wrap_element.lastChild;
    const top_nav_element= sticky_element.querySelector('.top_nav');
    top_nav_element.addEventListener("mousedown", StartDragWithSticky);

    //세이브
    const save_element = sticky_element.querySelector(".save");
    save_element.addEventListener("mousedown", this.SaveSticky);

    //삭제
    const del_element = sticky_element.querySelector(".del");
    del_element.addEventListener("mousedown", this.DelSticky);

    //새로 생성
    const add_element = sticky_element.querySelector(".add");
    add_element.addEventListener("mousedown", this.AddSticky);

    //새로 생성
    const get_element = sticky_element.querySelector(".get");
    get_element.addEventListener("mousedown", this.DisplayStickyInfo);
    }

    /**
     * @param  id 스티키 id를 설정한다.
     */
    SetId(id){

        const sticky_id = `${id}`;
        const cur_sticky = document.getElementById(sticky_id);
        this._sticky_element = cur_sticky;
    }

    /**
     * 
     * @param  zIndex zIndex를 설정한다. 
     */
    SetZIndex(zIndex){

        this._zIndex = zIndex;
        this._sticky_element.style.zIndex = zIndex;
    }

     /** 
     * @param  left x좌표
     * @param top y좌표 
     */
    SetXY(left, top){

        this._left =left;
        this._top = top;

        this._sticky_element.style.left = left + "px";
        this._sticky_element.style.top = top + "px";
    }

    InitMemo(){

        this._textarea_element = this._sticky_element.querySelector('textarea');
    }

    /**
     * @param text 바꿀 스티키 내용
     * @brief 스티키 내용을 출력한다.
     */
    SetMemo(text){

        this._text = text;
        this._textarea_element.innerHTML = text; 
    }

    /**
     * @brief 스티키 날짜를 설정한다.
     */
    SetDate(){

        let today = new Date();
        let dd = today.getDate();
        let mm = today.getMonth()+1; //January is 0!
        let yyyy = today.getFullYear();

        if(dd<10) {
            dd='0'+dd
        } 

        if(mm<10) {
            mm='0'+mm
        } 

        today = mm+'/'+dd+'/'+yyyy;
        
        this._date = today;
    }

    
    /**
     * @@brief 스티키 관련 DOM 엘레먼트를 생성한다.
     * @param id 부여 할 스티키 id 
     */
    CreateStickyElement(id){

        //div
        const sticky_element = document.createElement("div");
        sticky_element.className="sticky";
        sticky_element.id = `${id}`;

        //top nav
        const nav_top_element = document.createElement("nav");
        nav_top_element.className = "top_nav";

        //add icon
        const add_element = document.createElement("a");
        add_element.className="add";

        const add_icon= document.createElement("i");
        add_icon.className= "fa fa-plus";

        add_element.appendChild(add_icon);
        nav_top_element.appendChild(add_element);

        //save icon
        const save_element = document.createElement("a");
        save_element.className="save";

        const save_icon= document.createElement("i");
        save_icon.className= "fa fa-floppy-o";

        save_element.appendChild(save_icon);
        nav_top_element.appendChild(save_element);

        //right-div
        const right_element = document.createElement("div");
        right_element.className="right";
        

        const get_element= document.createElement("a");
        get_element.className= "get";

        const del_element= document.createElement("a");
        del_element.className= "del";


        const get_icon= document.createElement("i");
        get_icon.className= "fa fa-list";


        const del_icon= document.createElement("i");
        del_icon.className= "fa fa-times";
        

        get_element.appendChild(get_icon);
        del_element.appendChild(del_icon);

        right_element.appendChild(get_element);
        right_element.appendChild(del_element);
        
        nav_top_element.appendChild(right_element);        

        //textarea
        const textarea_element = document.createElement("textarea");
        textarea_element.name = "txt";
        textarea_element.className="txt";
        
        //side nav
        const side_nav_element = document.createElement("nav");
        side_nav_element.className ="side_nav";

        const ol_element = document.createElement("ol");
        side_nav_element.appendChild(ol_element);
        sticky_element.appendChild(side_nav_element);

        //other
        sticky_element.appendChild(nav_top_element);
        sticky_element.appendChild(textarea_element);

        g_sticky_wrap_element.appendChild(sticky_element);
    }

    /**
     * @brief 모든 스티키 정보를 로컬 스토리지에 저장한다.
     */
    SaveSticky(){

        event.stopPropagation();
        event.preventDefault();

        const tmp = this.parentNode.parentNode;
        const tmp2 = GetStickyObjWithStickyDiv(tmp);
        tmp2.SetMemo(tmp2._textarea_element.value);

        localStorage.setItem(g_STICKY_LS, JSON.stringify(g_sticky_list));
    }

    /**
     * @brief 해당 스티키를 삭제한다.
     */
    DelSticky(){

        event.stopPropagation();
        event.preventDefault();

        const sticky_element = this.parentNode.parentNode.parentNode;
        const sticky_object = GetStickyObjWithStickyDiv(sticky_element);
        
        g_sticky_wrap_element.removeChild(sticky_element);

        const del_id = sticky_object._id;

        const new_sticky_list = g_sticky_list.filter(function(obj){

            return (del_id !== obj._id);

        });

        g_sticky_list = new_sticky_list;

        if( g_sticky_list.length != 0){
            localStorage.setItem(g_STICKY_LS, JSON.stringify(g_sticky_list));
        } 
    }

    /**
     * 새 스티키를 추가한다.
     */
    AddSticky(){

        event.stopPropagation();
        event.preventDefault();

        const new_id = GetNewId();

        const top = Math.floor(Math.random() * (g_sticky_wrap_element.clientHeight - g_STICKY_HEIGHT) );
        const left = Math.floor(Math.random() * (g_sticky_wrap_element.clientWidth - g_STICKY_WIDTH));

        const new_sticky = new Sticky(new_id, top, left,"", 0,false);
        new_sticky.SetDate();
        AttachSticky(new_sticky);

        localStorage.setItem(g_STICKY_LS, JSON.stringify(g_sticky_list));
    }

    /**
     * @brief 해당 스티키의 정보를 출력한다.
     */
    DisplayStickyInfo(){

        event.stopPropagation();
        event.preventDefault();

        const side_nav_element = this.parentNode.parentNode.parentNode.querySelector(".side_nav");
        side_nav_element.classList.toggle("active");

        const sticky_element = side_nav_element.parentNode;
        const sticky_obj = GetStickyObjWithStickyDiv( sticky_element);

        const ol_element = side_nav_element.querySelector("ol");
        ol_element.innerHTML ="";
        ol_element.innerHTML+= `<li>ID: ${sticky_obj._id}</li>`;
        ol_element.innerHTML+= `<li>Date: ${sticky_obj._date}</li>`; 
    }
}

/**
 * @return original과 target이 겹쳐지면 true를 반환, 아닌 경우 false를 반환한다.
 * @@brief 스티키가 겹쳐지는 여부를 체크한다.
 * @param original 겹치는 대상 체크의 원본
 * @param target 겹치는 대상과 비교할 대상
 */
function CheckIsInSide(original, target){

    if( target._left <= original._left + g_STICKY_WIDTH && original._left + g_STICKY_WIDTH <= target._left + g_STICKY_WIDTH){

        if( target._top <= original._top + g_STICKY_HEIGHT && original._top + g_STICKY_HEIGHT <= target._top + g_STICKY_HEIGHT ){

            console.log(1);
            return true;
        }
    }

    if( target._left <= original._left + g_STICKY_WIDTH &&  original._left + g_STICKY_WIDTH <= target._left + g_STICKY_WIDTH){

        if( target._top <= original._top  && original._top <= target._top + g_STICKY_HEIGHT){

            console.log(2);
            return true;
        }
    }

    if( original._left  >= target._left &&  original._left <= target._left +g_STICKY_WIDTH ){

        if(original._top >= target._top && original._top <= target._top + g_STICKY_HEIGHT){

            console.log(3);
            return true;
        }
    } 

    if( target._left <= original._left && original._left <= target._left + g_STICKY_WIDTH){

        if( original._top + g_STICKY_HEIGHT  >= target._top && original._top +g_STICKY_HEIGHT <= target._top +g_STICKY_HEIGHT )
        {
            console.log(4);
            return true;
        }
    }

    return false;
}

/**
 * @@brief 스티키를 배치한다.
 * @param sticky 스티키 배치 정보가 담긴 오브젝트.
 */
function PutStickyWithZIndex(sticky){

    let max_zIndex = -1;

    for( let idx = 0; idx < g_sticky_list.length ; idx++){

        let cur_sticky_obj = g_sticky_list[idx];

        if(sticky._id == cur_sticky_obj._id ){

            continue;
        }

        let cur_sticky_left = cur_sticky_obj._left; 
        let cur_sticky_top = cur_sticky_obj._top;

        //옮기는 위기에 겹치는 스티키 메모장 중 가장 높은 zIndex값을 구한다.
        if( CheckIsInSide(sticky, cur_sticky_obj) ){

            let cur_zIndex =cur_sticky_obj._zIndex;

            if(max_zIndex < cur_zIndex){

                max_zIndex = cur_zIndex;
            }
        
        }
    }

    sticky.SetZIndex( max_zIndex+1);
}

/**
 * @@brief 스티키 삭제 버튼이 눌려졌을 경우
 */
function RemoveStickyWithZIndex(sticky){

    let cur_drag_zIndex = sticky._zIndex;

    //제거 된 경우 겹쳐진 나머지 스티키 중 제거 스티키 보다 위에 있는 스티키의 경우 z-index가 -1씩 되어야 한다.
    for( let idx = 0 ; idx <g_sticky_list.length; idx++){

        let cur_sticky_obj = g_sticky_list[idx];

        if( sticky._id == cur_sticky_obj._id){

            continue;
        }

        let cur_sticky_left = cur_sticky_obj._left; 
        let cur_sticky_top = cur_sticky_obj._top;

        if( CheckIsInSide(sticky, cur_sticky_obj)){

            let cur_zIndex = cur_sticky_obj._zIndex;
            if(cur_drag_zIndex < cur_zIndex){
        
                cur_sticky_obj.SetZIndex( --cur_zIndex);
            }
            
        }  
    }
}

/**
 * @return 스티키 리스트 중 빈 곳 중 가장 낮은 id를 반환한다. 
 * @@brief 새로운 id를 부여한다. 스티키 리스트 중 빈 곳 중 가장 낮은 id를 반환한다. 
 */
function GetNewId(){

    //오름차순 정렬
    sticky_list = g_sticky_list;
    sticky_list.sort(function(a,b){

        return parseInt(a._id, 10) - parseInt(b._id, 10); 
    });

    let cur_id = 0;

    //id 찾기 
    for(let idx = 0 ; idx < sticky_list.length ; idx++){

        const compare_id = parseInt( sticky_list[idx]._id );

        if (cur_id >= compare_id){

            cur_id = compare_id+1;
        }
        else{
            break;
        }
    }

    return cur_id;
}

/**
 * @param sticky 생성 할 스티키 정보가 담긴 참조 객체  
 */
function AttachSticky(sticky){

    g_sticky_list.push(sticky);
    
    //스티키를 배치한다.
    PutStickyWithZIndex(sticky);
}

/**
 * @brief 로컬 스토리지에 저장된 모든 스티키를 불러온다.
 */
function LoadStickys(){

    const sticky_list = JSON.parse(localStorage.getItem(g_STICKY_LS));

    if( null ===sticky_list || 0 === sticky_list.length){

        //하나도 없는 경우 기본 메모장 생성
        const curSticky = new Sticky(0 ,100, 100, "", 0, true);
        curSticky.SetDate();
        AttachSticky(curSticky);
        
        return;
    }

    let last_id = -1;

    for(let idx = 0 ; idx < sticky_list.length ; idx++){

        const id =sticky_list[idx]._id;
        const left =sticky_list[idx]._left;
        const top = sticky_list[idx]._top;
        const text =sticky_list[idx]._text;
        const zIndex = sticky_list[idx]._zIndex;
        const date = sticky_list[idx]._date;

        const curSticky = new Sticky(id ,top, left, text, zIndex, true ,date);
        AttachSticky(curSticky);
    }
}

function init(){

    LoadStickys();
}

//초기화
init();