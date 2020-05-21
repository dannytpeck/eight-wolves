import React, { useState, useEffect } from 'react';
import moment from 'moment';
import _ from 'lodash';
import Airtable from 'airtable';
const base = new Airtable({ apiKey: 'keyCxnlep0bgotSrX' }).base('appHXXoVD1tn9QATh');

import Header from './header';
import Footer from './footer';
import Modal from './modal';

function clientsReducer(state, action) {
  return [...state, ...action];
}

/* globals $ */
function App() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [activities, setActivities] = useState([]);

  const [startDate, setStartDate] = useState('2020-04-15');
  const [endDate, setEndDate] = useState('2020-12-01');

  const [imageUrl, setImageUrl] = useState('https://images.limeade.com/PDW/805d6a9d-186e-4462-8fe2-ca97a478ffca-large.jpg');
  const [title, setTitle] = useState('Uploaded from Eight Wolves');
  const [activityText, setActivityText] = useState('test the upload');
  const [shortDescription, setShortDescription] = useState('Test upload from Eight Wolves.');
  const [longDescription, setLongDescription] =useState('<p>So many wolves.</p>');

  const [clients, dispatch] = React.useReducer(
    clientsReducer,
    [] // initial clients
  );

  // When app first mounts, fetch clients
  useEffect(() => {

    base('Clients').select().eachPage((records, fetchNextPage) => {
      dispatch(records);

      fetchNextPage();
    }, (err) => {
      if (err) {
        console.error(err);
        return;
      }
    });

  }, []); // Pass empty array to only run once on mount

  function handleCsvFiles(e) {
    console.log(e);
    var reader = new FileReader();
    reader.onload = function() {
      // Do something with the data
      var challengeJson = csvToJson(reader.result)[0];
      console.log(challengeJson);

    };
    // start reading the file. When it is done, calls the onload event defined above.
    reader.readAsBinaryString(document.querySelector('#csv-input').files[0]);
  }

  // From https://gist.github.com/iwek/7154578#file-csv-to-json-js
  // Convert csv string to JSON
  function csvToJson(csv) {
    var lines = csv.split('\n');
    var result = [];
    var headers = lines[0].split(',');

    for (var i=1; i<lines.length; i++) {
      var obj = {};

      var row = lines[i],
        queryIdx = 0,
        startValueIdx = 0,
        idx = 0;

      if (row.trim() === '') {
        continue;
      }

      while (idx < row.length) {
        /* if we meet a double quote we skip until the next one */
        var c = row[idx];

        if (c === '"') {
          do {
            c = row[++idx];
          } while (c !== '"' && idx < row.length - 1);
        }

        if (c === ',' || /* handle end of line with no comma */ idx === row.length - 1) {
          /* we've got a value */
          var value = row.substr(startValueIdx, idx - startValueIdx).trim();

          /* skip first double quote */
          if (value[0] === '"') {
            value = value.substr(1);
          }
          /* skip last comma */
          if (value[value.length - 1] === ',') {
            value = value.substr(0, value.length - 1);
          }
          /* skip last double quote */
          if (value[value.length - 1] === '"') {
            value = value.substr(0, value.length - 1);
          }

          var key = headers[queryIdx++];
          obj[key] = value;
          startValueIdx = idx + 1;
        }

        ++idx;
      }

      result.push(obj);
    }
    return result;
  }

  function massUpload() {
    // Open the modal
    $('#uploadModal').modal();

    let timer = 0;

    // Upload to app clients
    const filteredClients = clients.filter(client => {
      //return client.fields['Has App'] === 'Yes';
      return client.fields['Has App'] === 'Yes' && client.fields['Uploaded'] !== '1';
    });

    // Set counter based on filteredClients
    $('#counter').html(`<p><span id="finishedUploads">0</span> / ${filteredClients.length}</p>`);

    filteredClients.map(client => {
      // 4 seconds between ajax requests, because limeade is bad and returns 500 errors if we go too fast
      // These requests average about 2.6-3.4 seconds but we've seen limeade take up to 4.4s, either way this
      // guarantees concurrent calls will be rare, which seem to be the source of our woes
      timer += 4000;
      setTimeout(() => {
        uploadChallenge(client);
      }, timer);
    });
  }

  function uploadChallenge(client) {
    // Open the modal
    $('#uploadModal').modal();

    const data = {
      'AboutChallenge': longDescription,
      'ActivityReward': {
        'Type': 'IncentivePoints',
        'Value': '0'
      },
      'ActivityType': activityText,
      'AmountUnit': '',
      'ChallengeLogoThumbURL': imageUrl,
      'ChallengeLogoURL': imageUrl,
      'ChallengeTarget': 1,
      'ChallengeType': 'OneTimeEvent',
      'Dimensions': [],
      'DisplayInProgram': startDate === moment().format('YYYY-MM-DD') ? true : false,  // sets true if the challenge starts today
      'DisplayPriority': '',
      'EndDate': endDate,
      'EventCode': '',
      'Frequency': 'None',
      'IsDeviceEnabled': false,
      'IsFeatured': null,
      'IsSelfReportEnabled': true,
      'IsTeamChallenge': false,
      'Name': title,
      'ShortDescription': shortDescription,
      'ShowExtendedDescription': false,
      'ShowWeeklyCalendar': false,
      'StartDate': startDate,
      'TeamSize': null
    };

    $.ajax({
      url: 'https://api.limeade.com/api/admin/activity',
      type: 'POST',
      dataType: 'json',
      data: JSON.stringify(data),
      headers: {
        Authorization: 'Bearer ' + client.fields['LimeadeAccessToken']
      },
      contentType: 'application/json; charset=utf-8'
    }).done((result) => {

      // Advance the counter
      let count = Number($('#finishedUploads').html());
      $('#finishedUploads').html(count + 1);

      $('#uploadModal .modal-body').append(`
        <div class="alert alert-success" role="alert">
          <p>Uploaded Tile for <a href="${client.fields['Domain']}/ControlPanel/RoleAdmin/ViewChallenges.aspx?type=employer" target="_blank"><strong>${client.fields['Account Name']}</strong></a></p>
          <p class="mb-0"><strong>Challenge Id</strong></p>
        <p><a href="${client.fields['Domain']}/admin/program-designer/activities/activity/${result.Data.ChallengeId}" target="_blank">${result.Data.ChallengeId}</a></p>
        </div>
      `);

    }).fail((request, status, error) => {
      console.error(request.status);
      console.error(request.responseText);
      console.log('Create challenge failed for client ' + client.fields['Limeade e=']);
    });

  }

  function selectClient(e) {
    clients.forEach((client) => {
      if (client.fields['Limeade e='] === e.target.value) {
        setSelectedClient(client);
      }
    });
  }

  function renderEmployerNames() {
    const sortedClients = [...clients];

    sortedClients.sort((a, b) => {
      const nameA = a.fields['Limeade e='].toLowerCase();
      const nameB = b.fields['Limeade e='].toLowerCase();
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0;
    });

    return sortedClients.map((client) => {
      return <option key={client.id}>{client.fields['Limeade e=']}</option>;
    });
  }

  return (
    <div id="app">
      <Header />

      <div className="form-group">
        <label htmlFor="employerName">EmployerName</label>
        <select id="employerName" className="form-control custom-select" onChange={selectClient}>
          <option defaultValue>Select Employer</option>
          {renderEmployerNames()}
        </select>
      </div>

      <div className="row">
        <div className="col text-left">
          <button type="button" className="btn btn-primary" id="uploadButton" onClick={() => uploadChallenge(selectedClient)}>Single Upload</button>
          <img id="spinner" src="images/spinner.svg" />
        </div>

        <div className="col text-left">
          <button id="csv-import" type="file" name="Import" className="btn btn-light">Import from CSV</button>
          <input type="file" id="csv-input" accept="*.csv" onChange={(e) => handleCsvFiles(e)} />
        </div>
      </div>

      <Footer />

      <Modal />

    </div>
  );
}

export default App;
