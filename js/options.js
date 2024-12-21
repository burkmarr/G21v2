import { getOpt, setOpt, keyValuePairTable, generalMessage, el } from "./common.js"
import { getFieldDefs } from './fields.js'
import { idb } from './nl.min.js'

export function initialiseGui() {
  // Initialise GUI option values
  document.getElementById("emulate-v1").checked = getOpt('emulate-v1') === "true"
  document.getElementById("georef-format").value = getOpt('georef-format')
  document.getElementById("georef-precision").value = getOpt('georef-precision')
  document.getElementById("automatic-playback").checked = getOpt('automatic-playback') === "true"
  document.getElementById("playback-volume").value = getOpt('playback-volume')
  document.getElementById("beep-volume").value = getOpt('beep-volume')
  document.getElementById("file-handling").value = getOpt('file-handling')
  document.getElementById("default-recorder").value = getOpt('default-recorder')
  document.getElementById("default-determiner").value = getOpt('default-determiner')

  initFileHandlingOptions()
  initNativeFolder()
  initFieldOptions()
  storageMetrics()
}

function initFileHandlingOptions() {
  // Disable file system options that are not available on this device
  if (typeof window.showDirectoryPicker === 'undefined') {
    document.querySelector('#file-handling option[value=native').setAttribute('disabled', '')
  }
}

async function initNativeFolder() {
  if (getOpt('file-handling') === 'native') {
    document.getElementById("native-browse-folder-button").disabled = false
    let directoryHandle = await idb.get('native-folder')
    if (directoryHandle) {
      document.getElementById("native-folder").innerHTML = `Folder name: ${directoryHandle.name}`
    } else {
      document.getElementById("native-folder").innerHTML = `No folder selected`
    }
  } else {
    document.getElementById("native-browse-folder-button").disabled = true
    document.getElementById("native-folder").innerHTML = ''
  }
}

export function useMode() {
  setOpt('emulate-v1', document.getElementById("emulate-v1").checked)
}
export function georefFormat() {
  setOpt('georef-format', document.getElementById("georef-format").value)
}

export function georefPrecision() {
  setOpt('georef-precision', document.getElementById("georef-precision").value)
}

export function automaticPlayback() {
  setOpt('automatic-playback', document.getElementById("automatic-playback").checked)
}

export function playbackVolume() {
  setOpt('playback-volume', document.getElementById("playback-volume").value)
}

export function beepVolume() {
  setOpt('beep-volume', document.getElementById("beep-volume").value)
}

export function fileHandling() {
  setOpt('file-handling', document.getElementById("file-handling").value)
  initNativeFolder()
}

export function defaultRecorder() {
  setOpt('default-recorder', document.getElementById("default-recorder").value)
}

export function defaultDeterminer() {
  setOpt('default-determiner', document.getElementById("default-determiner").value)
}

function optionalFieldChanged() {
  let optFields = ''
  getFieldDefs().forEach(f => {
    if (f.optional && el(`cb-${f.jsonId}`).checked) {
      if (optFields) {
        optFields = `${optFields} ${f.jsonId}`
      } else {
        optFields = f.jsonId
      }
    }
  })
  setOpt('optional-fields', optFields)
}

export async function browseNativeFolder() {
  try {
    const directoryHandle = await window.showDirectoryPicker()

    let granted = false
    if (await directoryHandle.queryPermission({mode: 'readwrite'}) === 'granted') {
      granted =  true
    }
    if (!granted) {
      // Request permission
      if (await directoryHandle.requestPermission({mode: 'readwrite'}) === 'granted') {
        granted =  true
      }
      if (!granted) {
        generalMessage(`You must grant read & write access to the folder you select.`)
      }
    }
    if (granted) {
      await idb.set('native-folder', directoryHandle)
      document.getElementById("native-folder").innerHTML = `Folder name: ${directoryHandle.name}`
    } else {
      await idb.set('native-folder', null)
      document.getElementById("native-folder").innerHTML = `No folder selected`
    }
  } catch (error) {
    // Will get here if the open folder dialog is cancelled by user, so do nothing
    //document.getElementById("native-folder").innerHTML =`${error.name}: ${error.message}`
  }
}

async function storageMetrics() {

  const perSupported = navigator.storage && navigator.storage.persist ? true : false
  const perGranted = perSupported && await navigator.storage.persisted()
  const {quota, usage, usageDetails} = await navigator.storage.estimate()
  //const detailsSupported = navigator.storage.estimate ? true : false 

  const rows = [
    {
      caption: 'Persistent storage available',
      value: perSupported ? 'Yes' : 'No'
    },
    {
      caption: 'Persistent storage granted',
      value: perGranted ? 'Yes' : 'No'
    },
    {
      caption: 'Total storage quota',
      value: formatBytes(quota)
    },
    {
      caption: 'Total app storage usage',
      value: formatBytes(usage)
    },
    {
      caption: 'App cache use',
      value: usageDetails ? formatBytes(usageDetails.caches) : 'Info not supported by this browser'
    },
    {
      caption: 'App file system use',
      value: usageDetails ? formatBytes(usageDetails.fileSystem) : 'Info not supported by this browser'
    },
    {
      caption: 'App service worker use',
      value: usageDetails ? formatBytes(usageDetails.serviceWorkerRegistrations) : 'Info not supported by this browser'
    }
  ]
  keyValuePairTable('storage-metrics-table', rows, document.getElementById('storage-metrics'))
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function initFieldOptions() {
  getFieldDefs().forEach(f => {
    const p = document.createElement('p')

    const iRecordText = f.iRecord ? ` Corresponds to the iRecord input field <i>${f.iRecord}</i>.` : 'This field is not imported by iRecord.'
    const iRecordTerm = f.iRecord && f.inputType.startsWith('term-') ? `
      You can choose a term from a list 
      of those accepted by iRecord, or you can enter a term of your
      own. (Don't enter your own term if planning to import to iRecord).` : ''
    const mandatory = f.optional ? '' : ' <b>This field must be included</b> - you cannot switch it off.'
    p.innerHTML = `
      <b>${f.inputLabel}</b>. ${f.info}${iRecordTerm}${iRecordText}${mandatory}
    `
    el('record-fields').appendChild(p)

    const br = document.createElement('br')
    p.appendChild(br)
    const toggleLabel = document.createElement('label')
    toggleLabel.classList.add('switch')
    const toggle = document.createElement('input')
    toggle.setAttribute('type', 'checkbox')
    toggle.setAttribute('id', `cb-${f.jsonId}`)
    if (!f.optional) {
      toggle.setAttribute('checked', 'checked')
      toggle.setAttribute('disabled', 'true')
    }
    toggle.addEventListener('change', optionalFieldChanged)
    toggleLabel.appendChild(toggle)
    const toggleSpan = document.createElement('span')
    toggleSpan.classList.add('slider')
    toggleSpan.classList.add('round')
    toggleLabel.appendChild(toggleSpan)

    p.appendChild(toggleLabel)

  })

  // <label class="switch">
  //     <input id="automatic-playback" type="checkbox">
  //     <span class="slider round"></span>
  //   </label>

}