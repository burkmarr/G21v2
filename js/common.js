import { taxonDetails } from './taxonomy.js'

export function detailsFromFilename(name) {
  if (!name) return ''
  const sName = name.split('_')
  const date = `${sName[0].substring(8,10)}/${sName[0].substring(5,7)}/${sName[0].substring(0,4)}`
  const time = sName[1].replace(/-/g, ':')
  let location, accuracy, altitude
  if (sName.length === 5) {
    // Name is in GR
    location = sName[2]
    accuracy = sName[3]
    altitude = sName[4].substring(0, sName[4].length-4)
  } else {
    // Name is lat/lon format
    location = `${sName[2]}/${sName[3]}`
    accuracy = sName[4]
    altitude = sName[5].substring(0, sName[5].length-4)
  }
  return {
    filename: name,
    date: date,
    time: time,
    location: location,
    accuracy: accuracy,
    altitude: altitude
  }
}

export function getFieldDefs(filename) {
  // Filename can be null - only affects default values
  // for some fields.
  const filenameDetails = filename ? detailsFromFilename(filename) : null

  return [
    {
      inputId: 'recorder-name-input',
      inputType: 'text',
      inputLabel: 'Recorder',
      jsonId: 'recorder',
      default: getOpt('default-recorder'),
      novalue: ''
    },
    {
      inputId: 'determiner-name-input',
      inputType: 'text',
      inputLabel: 'Determiner',
      jsonId: 'determiner',
      default: getOpt('default-determiner'),
      novalue: ''
    },
    {
      inputId: 'record-date-input',
      inputType: 'date',
      inputLabel: 'Record date',
      jsonId: 'date',
      default: filenameDetails ? dateFromString(filenameDetails.date) : '',
      novalue: ''
    },
    {
      inputId: 'record-time-input',
      inputType: 'time',
      inputLabel: 'Record time',
      jsonId: 'time',
      default: filenameDetails ? filenameDetails.time.substring(0,5) : '00:00',
      novalue: '00:00'
    },
    {
      inputId: 'scientific-name-input',
      inputType: 'taxon',
      inputLabel: 'Scientific name',
      jsonId: 'scientific-name',
      default: '',
      novalue: '',
      detailsFn: taxonDetails
    },
    {
      inputId: 'common-name-input',
      inputType: 'taxon',
      inputLabel: 'Common name',
      jsonId: 'common-name',
      default: '',
      novalue: '',
      detailsFn: taxonDetails
    },
    {
      inputId: 'gridref-input',
      inputType: 'text',
      inputLabel: 'Grid reference',
      jsonId: 'gridref',
      default: filenameDetails ? filenameDetails.location : '',
      novalue: ''
    },
    {
      inputId: 'location-input',
      inputType: 'text',
      inputLabel: 'Location name',
      jsonId: 'location',
      default: '',
      novalue: ''
    },
  ]
}

export function dateFromString(dateString) {
  const dte = new Date()
  const day = dateString.substring(0,2)
  const month = dateString.substring(3,5)
  const year = dateString.substring(6)
  return `${year}-${month}-${day}`
}

export function getOpt(id) {
  const defaultOpts = {
    'emulate-v1': 'false',
    'filename-format': 'osgr',
    'automatic-playback': 'false',
    'playback-volume': '0.5',
    'beep-volume': '0.5',
    'file-handling': 'opfs',
    'default-recorder': '',
    'default-determiner': '',
  }
  return localStorage.getItem(id) ? localStorage.getItem(id) : defaultOpts[id]
}

export function setOpt(id, value) {
  localStorage.setItem(id, value)
}

export function el(id) {
  return document.getElementById(id)
}

export function keyValuePairTable(id, rows, parent) {
  //console.log(rows)
  const table = document.createElement('table')
  table.setAttribute('id', id)
  table.classList.add('key-value-pair-table')
  parent.appendChild(table)
  rows.forEach(r => {
    const tr = document.createElement('tr')
    table.appendChild(tr)
    const td1 = document.createElement('td')
    td1.classList.add('caption')
    td1.innerHTML = `<b>${r.caption}</b>:`
    tr.appendChild(td1)
    const td2 = document.createElement('td')
    td2.classList.add('value')
    td2.innerHTML = r.value
    tr.appendChild(td2)
  })
}

export function unorderedList(id, rows, parent) {
  //console.log(rows)
  const ul = document.createElement('ul')
  ul.setAttribute('id', id)
  ul.classList.add('value-list')
  parent.appendChild(ul)
  rows.forEach(r => {
    const li = document.createElement('li')
    ul.appendChild(li)
    li.innerHTML = r
  })
}

export function collapsibleDiv(id, caption, parent) {
  const div = document.createElement('div')
  div.setAttribute('id', id)
  div.classList.add('collapsible')
  parent.appendChild(div)
  div.innerHTML = `
    <div class='collapsible-caption'>
      <b>${caption}</b> <span class='collapsible-toggle'>[show]</span>
    </div>
    <div class='collapsible-content hide'></div>
  `
  
  const toggle = document.querySelector(`#${id} .collapsible-toggle`)
  toggle.addEventListener('click', function(e){
    if (e.target.innerText === '[show]') {
      e.target.innerText = '[hide]'
      document.querySelector(`#${id} .collapsible-content`).classList.remove('hide')
    } else {
      e.target.innerText = '[show]'
      document.querySelector(`#${id} .collapsible-content`).classList.add('hide')
    }
  })

  return document.querySelector(`#${id} .collapsible-content`)
}