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
    const url = "createKonto";
    try {
        fetch(url, {
            body: name.value,
            method: "POST"
        }).then((response) => {
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            response.json().then((json) => {
                let kontoListe = document.getElementById('kontoListe');
                let newKonto = document.createElement('li');
                newKonto.innerText = name.value;
                newKonto.id = 'konto' + json.data.id;
                kontoListe.appendChild(newKonto);
            });
        });   
    } catch (error) {
        console.error(error.message);
    }
}
