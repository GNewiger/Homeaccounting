var i = 0;

var addKontoClicked = function() {
    let kontoListe = document.getElementById('kontoListe');
    let newKonto = document.createElement('li');
    newKonto.innerText = 'neues Konto';
    newKonto.id = 'konto' + i++;
    kontoListe.appendChild(newKonto);
}
