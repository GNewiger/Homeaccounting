const url = "/konten";
    try {
        fetch(url).then((response) => {
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            response.json().then((data) => {
                let kontoListe = document.getElementById('kontoListe');
                data.forEach((d)=>{
                    let tr = document.createElement('tr');
                    let tdName = document.createElement('td');
                    let tdSaldo = document.createElement('td');
                    
                    tr.id = 'konto' + d.id;
                    tdName.id = 'konto' + d.id + '_name';
                    tdSaldo.id = 'konto' + d.id + '_saldo';
                    
                    tdName.innerText = d.name;
                    tdSaldo.innerText = d.haben_in_cents - d.soll_in_cents;
                    
                    kontoListe.appendChild(tr);
                    tr.appendChild(tdName);
                    tr.appendChild(tdSaldo);
                });
            });
        });   
    } catch (error) {
        console.error(error.message);
    }

var addKontoClicked = function() {
    // add konto
    const name = document.getElementById("nameInput");
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
                let tdName = document.createElement('td');
                let tdSaldo = document.createElement('td');
                
                tr.id = 'konto' + json.data.id;
                tdName.id = 'konto' + json.data.id + '_name';
                tdSaldo.id = 'konto' + json.data.id + '_saldo';
                
                tdName.innerText = name.value;
                tdSaldo.innerText = 0;
                
                kontoListe.appendChild(tr);
                tr.appendChild(tdName);
                tr.appendChild(tdSaldo);
            });
        });   
    } catch (error) {
        console.error(error.message);
    }
}
