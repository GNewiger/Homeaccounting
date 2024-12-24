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
