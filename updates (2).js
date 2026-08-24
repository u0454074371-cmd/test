// ==================== Update log ====================
// Voeg hier nieuwe updates toe met een titel, datum, tijd en info.
// Belangrijk: de NIEUWSTE update moet BOVENAAN in de lijst staan.
//
// De tijd (bijv. '14:30') komt naast de datum te staan, in het kopje van de
// update — dus die is altijd zichtbaar, ook zonder de update uit te klappen.
//
// Voorbeeld van een nieuwe update (kopieer dit blokje en zet het bovenaan):
// {
//   title: 'Korte titel van de update',
//   date: '20-08-2026',
//   time: '14:30',
//   info: 'Iets langere uitleg over wat er precies is veranderd of toegevoegd.'
// },

const UPDATES = [
  { 
    title: 'Zelfservice en andere nieuwe dingen', 
    date: '24-08-2026', 
    time: 'unknown', 
    info: 'dit is de grootste update die ooit gedaan zal worden het zal verschillende nieuwe grote dingen bevatten zoals een zelfservice systeem dit werkt zo: mensen scannen een qr code die te zien is in instellingen mensen kiezen een tafel en kiezen de producten die ze willen bestellen met de opmerkingen bijv. ijsklontjes ze kunnen ook nog een extra getypte opmerking toevoegen ze sturen de bestelling naar de keuken daar gaat alles zoals normaal maar terwijl de bestelling gemaakt wordt kunnen de klanten bij verzonden bestellingen zien in welk stadium de bestelling is en hoeveel bestellingen er nog voor zijn voordat hij naar het nieuwe stadium gaat uiteundelijk wordt de bestelling naar de historie gestuurd en werkt het afrekenen hetzelfde ik heb ook toegevoegd dat ik bij systeem beheer je restaurant een waarschuwing kan geven als je restaurant niet helemaal op orde is ik heb ook nog de stijl flink geupgrade hij ziet er nu nog veel beter uit de volgende update zal kleiner zijn maar nog steeds net zo cool en hij komt binnenkort al uit!'
  },     
  {
    title: 'kleine update met een paar verbeteringen',
    date: '24-08-2026',
    time: '11:45',
    info: 'ik heb een paar kleine dingen toegevoegd ten eerste kun je nu het lettertype veranderen je kunt kiezen uit 15 verschillende lettertypen ik heb ook mijn systeembeheer een beetje beter beveiligd ook kun je nu de tijd van de update release zien bij de update log natuurlijk zijn er ook ngo een paar bugfixes de volgende update zal de grootste ooit worden dus ben er zeker van dat je die ook uitcheckt als hij uit is!'
  },     
  {
    title: 'Systeem beheer en voorraad tab', 
    date: '24-08-2026', 
    time: '08:00',
    info: 'ik heb veel nieuwe dingen toegevoegd laten we beginnen bij de naamkleur aanpassen je kunt nu de naamkleur van je restaurant aanpassen en je moet jezelf nu een naam geven als je een retsaurant joint of maakt deze kleur kun je ook aanpassen ook heb ik toegevoegd dat je nu een restaurant makkelijk kunt verlaten in instellingen en als de eigenaar het restaurant verlaat wordt het hele restaurant verwijdert daarnaast heb ik ook toegevoegd dat je nu een bank horizontaal of verticaal kan zetten en ook heb ik toegevoegd dat ik als eigenaar elk retsaurant kan beheren, aanpassen en verwijderen als nodig ook kan ik hier andere kleine dingen in doen en als laatste (en de grootste) heb ik een nieuwe voorraad tab toegevoegd hier staan alle producten in en je kunt deze op uitverkocht zetten dan zijn ze niet meer te bestellen we hebben ook nog een paar bugfixes doorgevoerd de volgende update zal wat kleiner zijn maar zorg alsnog dat je die ook gaat uitchecken als hij uit is!'
  },    
  {
    title: 'Opmerkingen en nieuwe meubels',
    date: '22-08-2026',
    time: '20:00', 
    info: 'Ten eerste heb ik toegevoegd dat je zelf extra opmerkingen kunt toevoegen zoals extra saus je kunt hier ook een emoji voor kiezen en het werkt een beetje zoals het oude ijsklontjes systeem ook heb ik toegevoegd dat je nu extra meubels kunt toevoegen dit zijn de nieuwe meubels: Een bar, een keuken en een bank ook kun je de tafels andere vormen geven dit zijn de vormen: rond, vierkant en rechthoek ook heb ik nog 5 extra achtergrond kleuren toegeovegd de volgende update word heel groot en zal binnenkort uitkomen!'
  },
  {
    title: 'Kleine update met een paar veranderingen',
    date: '20-08-2026',
    time: '21:00', 
    info: 'Ik heb 2 nieuwe dingen toegevoegd: Ten eerste heb ik toegevoegd dat je nu kunt kiezen welke achtergrondkleur je wilt je kunt kiezen uit 25 kleuren! Ten tweede heb ik toegevoegd dat je de plattegrond groter dan 20x20 vierkantjes kunt maken er zijn ook nog een paar kleine bugfixes de volgende update komt binnenkort uit dit zal een hele grote zijn!'
  },
  {
    title: 'Grote Update met veel nieuwe features',
    date: '19-08-2026',
    time: '20:30', 
    info: 'Ten eerste heb ik toegevoegd dat je je leden kunt beheren en kunt kiezen in welke tabs je leden kunnen komen bijv bestellen en historie dan kunnen ze alleen in de historie ten tweede heb ik een update log toegevoegd waar je de updates kunt zien die we doen ten derde heb ik toegevoegd dat je leden kunt kicken en dan refresht de code automatisch en ten vierde heb ik gefixt dat je nu aan beide kanten een gebied kunt vergroten en ten vijfde heb ik de stijl een beetje verandert waardoor het er nu stukken cleaner uitziet ik heb ook nog een paar andere bugs gefixt de nieuwe update komt uit binnenkort over een paar dagen!'
  },
];

// ==================== Weergave (niet nodig om aan te passen) ====================
function renderUpdatesList() {
  const list = document.getElementById('updates-list');
  if (!list) return;

  if (UPDATES.length === 0) {
    list.innerHTML = '<div class="empty-msg">Nog geen updates.</div>';
    return;
  }

  list.innerHTML = '';
  UPDATES.forEach(u => {
    const item = document.createElement('div');
    item.className = 'update-item';
    item.innerHTML = `
      <button type="button" class="update-item-head">
        <span class="update-item-title">${escapeHtmlUpdates(u.title)}</span>
        <span class="update-item-right">
          <span class="update-item-date">${escapeHtmlUpdates(u.date)}${u.time ? ' · ' + escapeHtmlUpdates(u.time) : ''}</span>
          <span class="update-item-arrow">▾</span>
        </span>
      </button>
      <div class="update-item-info">${escapeHtmlUpdates(u.info)}</div>
    `;
    item.querySelector('.update-item-head').addEventListener('click', () => {
      item.classList.toggle('open');
    });
    list.appendChild(item);
  });
}

function escapeHtmlUpdates(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

renderUpdatesList();

// Gebruikt de openModal-functie die al door landing.js / restaurant.js is gedefinieerd.
const btnUpdates = document.getElementById('btn-updates');
if (btnUpdates) {
  btnUpdates.addEventListener('click', () => openModal('modal-updates'));
}
