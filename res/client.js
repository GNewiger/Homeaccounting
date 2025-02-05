const url = "/konten";
var selectedKonto;
    try {
        fetch(url).then((response) => {
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            response.json().then((data) => {
                let kontoListe = document.getElementById('kontoListe');
                data.forEach((d)=>{
                    let tr = document.createElement('tr');
                    let a = document.createElement('a');
                    let tdName = document.createElement('td');
                    let tdSaldo = document.createElement('td');
                    
                    a.id = 'konto_a' + d.id;
                    tr.id = 'konto' + d.id;
                    tdName.id = 'konto_name' + d.id;
                    tdSaldo.id = 'konto_saldo' + d.id;
                    
                    a.setAttribute("href", "javascript:void(0)");
                    a.setAttribute("onclick", `selectKonto(${d.id})`);
                    tdName.innerText = d.name;
                    tdSaldo.innerText = d.haben_in_cents - d.soll_in_cents;

                    kontoListe.appendChild(tr);
                    tr.appendChild(a);
                    tr.appendChild(tdSaldo);
                    a.appendChild(tdName);
                });
            });
        });   
    } catch (error) {
        console.error(error.message);
    }
    
function selectKonto(id) {
    const selectedKontoName = document.getElementById(`konto_name${id}`);
    selectedKonto = id;
    document.getElementById("selectedKontoName").innerText = selectedKontoName.innerText;
    document.getElementById("selectedKontoName").innerText = selectedKontoName.innerText;
    document.getElementById("kontoSection").removeAttribute("hidden");
    document.getElementById("buchungSection").removeAttribute("hidden");
    document.getElementById("selectedKontoName").removeAttribute("hidden");
}

function addKontoClicked() {
    // add konto
    const name = document.getElementById("kontoNameInput");
    if (name.value == "") {
        alert('Bitte Namen des Kontos eingeben.');
        return;
    }
    const url = "create-konto";
    try {
        fetch(url, {
            body: name.value,
            method: "POST"
        }).then((response) => {
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            let kontoListe = document.getElementById('kontoListe');
            response.json().then((json) => {
                let tr = document.createElement('tr');
                let a = document.createElement('a');
                let tdName = document.createElement('td');
                let tdSaldo = document.createElement('td');
                
                a.id = 'konto_a' + json.data.id;
                tr.id = 'konto' + json.data.id;
                tdName.id = 'konto_name' + json.data.id;
                tdSaldo.id = 'konto_saldo' + json.data.id;
                
                a.setAttribute("href", "javascript:void(0)");
                a.setAttribute("onclick", `selectKonto(${json.data.id})`);
                tdName.innerText = name.value;
                tdSaldo.innerText = 0;

                kontoListe.appendChild(tr);
                tr.appendChild(a);
                tr.appendChild(tdSaldo);
                a.appendChild(tdName);
            });
        });   
    } catch (error) {
        console.error(error.message);
    }
}

function addBuchungClicked() {
    //validate
    if (!document.getElementById('buchungHaben').checked && !document.getElementById('buchungSoll').checked){
        alert('Soll oder Haben auswählen!');
        return;
    }

    let kontoListe = document.querySelectorAll("td[id^='konto_name']");
    const target1Element = document.getElementById("buchungTarget1");
    const target2Element = document.getElementById("buchungTarget2");
    const target3Element = document.getElementById("buchungTarget3");
    var target1Id;
    var target2Id;
    var target3Id;
    for (const k of kontoListe){
        console.log('k.parentNode.parentNode: '+ JSON.stringify(k.parentNode.parentNode));
        console.log('k.parentNode.parentNode.id.split(): '+ k.parentNode.parentNode.id.split('konto'));
        console.log('');
        if (k.innerText == target1Element.value) {
            target1Id = k.parentNode.parentNode.id.split('konto')[1];
        } else if (k.innerText == target2Element.value){
            target2Id = k.parentNode.parentNode.id.split('konto')[1];
        } else if (k.innerText == target3Element.value){
            target3Id = k.parentNode.parentNode.id.split('konto')[1];
        }
    }
    
    const source = {id: selectedKonto, description: document.getElementById('buchungDescriptionSource')};
    const sourceKontoHaben = document.getElementById('buchungHaben').checked;
    const target1 = {id: target1Id, 
            amount: document.getElementById('buchungBetrag1').value, 
            description: document.getElementById('buchungDescriptionTarget1').value};
    const target2 = {id: target2Id, 
            amount: document.getElementById('buchungBetrag2').value, 
            description: document.getElementById('buchungDescriptionTarget2').value};
    const target3 = {id: target3Id, 
            amount: document.getElementById('buchungBetrag3').value, 
            description: document.getElementById('buchungDescriptionTarget3').value};
    const requestBody = {source: source, sourceKontoHaben: sourceKontoHaben, target1: target1, target2: target2, target3: target3};
    const url = "buchen";
    try {
        fetch(url, {
            body: JSON.stringify(requestBody),
            headers: { 
                "Content-Type": "application/json"
            },
            method: "POST"
        }).then((response) => {
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            //todo: update Buchungen section
            alert('Buchung erfolgreich!');
        });   
    } catch (error) {
        console.error(error.message);
    }   

}
