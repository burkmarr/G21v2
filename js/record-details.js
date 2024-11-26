import { el, getOpt, getFieldDefs, keyValuePairTable, detailsFromFilename } from './common.js'
import { hideTaxonMatches, displayTaxonMatches, taxonDetails } from './taxonomy.js'
import { getRecordJson, storSaveFile } from './file-handling.js'

if (el('record-details')) {
  generateRecordFields(el('record-details'))
  populateRecordFields()
}

function createInputLabel(parent, label) {
  const ldiv = document.createElement('div')
  ldiv.innerHTML = label
  parent.appendChild(ldiv)
}

function createInputDiv(parent, id) {
  const div = document.createElement('div')
  div.setAttribute('id', id)
  div.classList.add('record-details-input')
  parent.appendChild(div)
  return div
}

function generateRecordFields(parent) {

  // Generate the input fields
  getFieldDefs().forEach(f => {
    const ctrl = createInputDiv(parent, f.inputId.substring(0,f.inputId.length-6))
    createInputLabel(ctrl, `${f.inputLabel}:`)
    const input = document.createElement('input')
    input.setAttribute('id', f.inputId)
    input.setAttribute('type', f.inputType)
    input.addEventListener('input', highlightFields)
    input.addEventListener('focus', fieldFocus)
    ctrl.appendChild(input)

    // Custom control modifications
    // Taxon
    if (f.inputType === 'taxon') {
      input.setAttribute('type', 'text')
      input.addEventListener('input', displayTaxonMatches)
      el('manage').addEventListener('click', hideTaxonMatches)
      // Only create the taxon matches under the common name control
      if (f.inputId === 'common-name-input') {
        const ul =  document.createElement('div')
        ul.setAttribute('id', 'taxon-suggestions')
        ctrl.appendChild(ul)
      }
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          taxonDetails()
        }
      })
    }
  })

  // Save/cancel buttons
  const ctrl = createInputDiv(parent, 'record-save-cancel')
  parent.appendChild(ctrl)
  const cancel = document.createElement('button')
  cancel.innerText = 'Cancel'
  cancel.addEventListener('click', cancelRecord)
  ctrl.appendChild(cancel)
  const save = document.createElement('button')
  save.innerText = 'Save'
  save.addEventListener('click', saveRecord)
  ctrl.appendChild(save)
}

function fieldFocus(e) {
  // Selected file
  const selectedFile = sessionStorage.getItem('selectedFile')
  const id = e.target.getAttribute('id')
  const fieldDef = getFieldDefs(selectedFile).find(fd => fd.inputId === id)
  if (fieldDef.detailsFn) {
    fieldDef.detailsFn(id)
  } else {
    defaultDetails()
  }
}

export function defaultDetails() {
  // The default information to show for field details
  // is the original WAV file details.
  const selectedFile = sessionStorage.getItem('selectedFile')

  el('field-details').innerHTML = `
    <h3>Original recording details<h3>
  `
  if (selectedFile) {
    const details = detailsFromFilename(selectedFile)
    const rows = []
    rows.push({caption: 'Filename', value: selectedFile})
    rows.push({caption: 'Date', value: details.date})
    rows.push({caption: 'Time', value: details.time})
    rows.push({caption: 'Loc', value: details.location})
    rows.push({caption: 'Accuracy', value: details.accuracy + ' m'})
    rows.push({caption: 'Altitude', value: details.altitude === '' ? 'not recorded' : details.altitude + ' m'})
    keyValuePairTable('wav-details', rows, el('field-details'))
  } else {
     el('field-details').innerHTML = ``
  }
}

async function cancelRecord() {
  await populateRecordFields()
}

async function saveRecord() {
  // Selected file
  const selectedFile = sessionStorage.getItem('selectedFile')
  // Build JSON structure
  // const json = {
  //   wav: sessionStorage.getItem('selectedFile'),
  // }

  const json = await getRecordJson(`${selectedFile}.txt`)
  console.log(json)

  getFieldDefs(selectedFile).forEach(f => {
    json[f.jsonId] =  el(f.inputId).value
  })

  //console.log('new json', json)
  // Save the file
  const jsonString = JSON.stringify(json)
  await storSaveFile(new Blob([jsonString], { type: "text/plain" }), `${selectedFile}.txt`)
  highlightFields()
}

export async function populateRecordFields() {

  // Selected file
  const selectedFile = sessionStorage.getItem('selectedFile')
  console.log('selectedFile', selectedFile)
  let json
  if (selectedFile) {
    //console.log(`${selectedFile}.txt`)
    // Get corresponding record JSON if it exists
    json = await getRecordJson(`${selectedFile}.txt`)
  }
  //console.log('json', json)

  getFieldDefs(selectedFile ? selectedFile : null).forEach(f => {
    if (json) {
      el(f.inputId).value = json[f.jsonId]
    // } else if (selectedFile) {
    //   el(f.inputId).value = f.default
    } else {
      el(f.inputId).value = f.novalue
    }
  })

  highlightFields()

  // Initialise the field details panel
  defaultDetails()

  // Disable all the input fields if no record selected
  if (selectedFile) {
    el('record-details').classList.remove('disable') 
  } else {
    el('record-details').classList.add('disable') 
  }
}

export async function highlightFields() {

  // Selected file
  const selectedFile = sessionStorage.getItem('selectedFile')
  let json
  if (selectedFile) {
    // Get corresponding record JSON if it exists
    json = await getRecordJson(`${selectedFile}.txt`)
  }
  let edited = false
  getFieldDefs(selectedFile ? selectedFile : null).forEach(f => {
    const fld = el(f.inputId)
    fld.classList.remove('edited')
    fld.classList.remove('saved')
    if (selectedFile) {
      if (json) {
        if (fld.value === json[f.jsonId]) {
          fld.classList.add('saved')
        } else {
          fld.classList.add('edited')
          edited = true
        }
      } else if (fld.value !== f.default) {
        fld.classList.add('edited')
        edited = true
      }
    }
  })

  if (edited) {
    el('record-save-cancel').classList.add('edited')
  } else {
    el('record-save-cancel').classList.remove('edited')
  }
}

export function openTab(e, divId) {

  // Get all elements with class="tabcontent" and hide them
  const tabcontent = document.getElementsByClassName("tabcontent")
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].classList.add('hide')
  }

  //Get all elements with class="tablinks" and remove the class "active"
  const tablinks = document.getElementsByClassName('tablinks')
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove('active')
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(divId).classList.remove('hide')
  e.currentTarget.classList.add('active')
}