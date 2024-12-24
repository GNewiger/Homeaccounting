var addKontoClicked = function(name) {
    // add konto
    const url = "createKonto";
    try {
        fetch(url, {
            body: name,
            method: "POST"
        }).then((response) => {
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            response.json().then((json) => {
                let kontoListe = document.getElementById('kontoListe');
                let newKonto = document.createElement('li');
                newKonto.innerText = name;
                newKonto.id = 'konto' + json.data.id;
                kontoListe.appendChild(newKonto);
            });
        });   
    } catch (error) {
        console.error(error.message);
    }
}
