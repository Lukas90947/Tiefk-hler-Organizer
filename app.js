let items = JSON.parse(localStorage.getItem("items")) || [];

function save(){
localStorage.setItem("items",JSON.stringify(items));
}

function render(){
let list=document.getElementById("list");
list.innerHTML="";

items.forEach((item,i)=>{
let li=document.createElement("li");
li.innerHTML=item+" <button onclick='removeItem("+i+")'>❌</button>";
list.appendChild(li);
});
}

function addItem(){
let input=document.getElementById("item");
items.push(input.value);
input.value="";
save();
render();
}

function removeItem(i){
items.splice(i,1);
save();
render();
}

render();
