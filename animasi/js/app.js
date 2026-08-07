const lib=JSON.parse(localStorage.getItem('chars')||'[]');
function render(){let ul=document.getElementById('library');ul.innerHTML='';
lib.forEach(c=>{let li=document.createElement('li');li.textContent=`${c.role}: ${c.name} (${c.outfit})`;ul.appendChild(li);});}
render();
function saveCharacter(){
 const c={name:name.value,role:role.value,outfit:outfit.value,faceless:faceless.checked};
 lib.push(c);localStorage.setItem('chars',JSON.stringify(lib));render();alert('Tersimpan');
}
function generate(){
 let chars=lib.map(c=>`${c.role}: ${c.name}, pakaian ${c.outfit}, faceless mannequin`).join('; ');
 output.textContent=`STYLE: ${style.value}
SCENE: ${scene.value}

PROMPT:
Ultra detailed ${style.value}, Islamic family, ${chars}. ${scene.value}. Maintain EXACT SAME CHARACTER across every scene, faceless mannequin, no eyes, no nose, no mouth, cinematic lighting, 3D render, ultra HD.

NEGATIVE:
low quality, blur, extra fingers, watermark, text, face, eyes, nose, mouth`;
}
themeBtn.onclick=()=>document.body.classList.toggle('dark');
