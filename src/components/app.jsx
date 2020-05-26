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
  const [clientsFromCsv, setClientsFromCsv] = useState(null);

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

  function handleClientsCsvFiles(e) {
    let reader = new FileReader();
    reader.onload = function() {
      // Parse the client csv and update state
      let clientsJson = csvToJson(reader.result);
      setClientsFromCsv(clientsJson);
    };
    // Start reading the file. When it is done, calls the onload event defined above.
    reader.readAsBinaryString(e.target.files[0]);
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

    const accountNamesList = clientsFromCsv.map(client => client['Account: Account Name']);

    // Filter clients by the list of account names in the user uploaded CSV
    const filteredClients = clients.filter(client => {
      return accountNamesList.includes(client.fields['Salesforce Name']);
    });

    console.log(filteredClients);

    // Set counter based on filteredClients
    $('#counter').html(`<p><span id="finishedUploads">0</span> / ${filteredClients.length}</p>`);

    // filteredClients.map(client => {
    //   // 4 seconds between ajax requests, because limeade is bad and returns 500 errors if we go too fast
    //   // These requests average about 2.6-3.4 seconds but we've seen limeade take up to 4.4s, either way this
    //   // guarantees concurrent calls will be rare, which seem to be the source of our woes
    //   timer += 4000;
    //   setTimeout(() => {
    //     uploadChallenge(client);
    //   }, timer);
    // });
  }

  function uploadChallenge(client) {
    // Open the modal
    $('#uploadModal').modal();

    const data = {
      'AboutChallenge': longDescription,
      'ActivityReward': {
        'Type': 'IncentivePoints',
        'Value': pointValue
      },
      'ActivityType': activityType, // Activity in csv, except for definition above
      'AmountUnit': amountUnit,
      'ButtonText': partnerId === 1 ? 'CLOSE' : '',
      'ChallengeLogoThumbURL': imageUrl,
      'ChallengeLogoURL': imageUrl,
      'ChallengeTarget': challengeTarget, // Target in csv
      'ChallengeType': challengeType, // ChallengeType in csv
      'Dimensions': [],
      'DisplayInProgram': startDate === moment().format('YYYY-MM-DD') ? true : false,  // sets true if the challenge starts today
      'DisplayPriority': displayPriority,
      'EndDate': endDate,
      'EventCode': eventCode,
      'Frequency': frequency,
      'IsDeviceEnabled': enableDeviceTracking === 1 ? true : false, // EnableDeviceTracking in csv
      'IsFeatured': isFeatured === 1 ? true : false, // isFeatured in csv
      'FeaturedData': {
        'Description': isFeatured === 1 ? shortDescription : false,
        'ImageUrl': isFeatured === 1 ? imageUrl : false
      },
      'IsSelfReportEnabled': allowSelfReport === 1 ? true : false,
      'IsTeamChallenge': isTeamChallenge,
      'Name': title, // ChallengeName in csv
      'PartnerId': partnerId, // IntegrationPartnerId in csv
      'ShortDescription': shortDescription,
      'ShowExtendedDescription': partnerId === 1 ? true : false,
      'ShowWeeklyCalendar': false, // not sure what this does, CTRT has this as false
      'StartDate': startDate,
      'TargetUrl': partnerId === 1 ? '/Home?sametab=true' : '',
      // trying to check for targeting by seeing if there are values in subgroup or field1 name
      'Targeting': subgroup || field1 ? [
        {
          'SubgroupId': subgroup ? subgroup : '0', // if no subgroup, use 0 aka none
          'Name': '', // let's hope this is optional since How would we know the Subgroup Name?
          'IsImplicit': field1 ? true : false, // not sure what this does. Seems to be true for tags and false for subgroups.
          'IsPHI': false,
          'Tags':
            field1 ? makeTags() : null
        }
      ] : [], // if no targeting, use an empty array
      'TeamSize': isTeamChallenge === 1 ? { MaxTeamSize: maxTeamSize, MinTeamSize: minTeamSize } : null
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
        <div className="alert alert-success" role="alert">
          <p>Uploaded Tile for <a href="${client.fields['Domain']}/ControlPanel/RoleAdmin/ViewChallenges.aspx?type=employer" target="_blank"><strong>${client.fields['Account Name']}</strong></a></p>
          <p className="mb-0"><strong>Challenge Id</strong></p>
        <p><a href="${client.fields['Domain']}/admin/program-designer/activities/activity/${result.Data.ChallengeId}" target="_blank">${result.Data.ChallengeId}</a></p>
        </div>
      `);

    }).fail((xhr, request, status, error) => {
      console.error(xhr.responseText);
      console.error(request.status);
      console.error(request.responseText);
      console.log('Create challenge failed for client ' + client.fields['Limeade e=']);
      $('#uploadModal .modal-body').html(`
          <div class="alert alert-danger" role="alert">
            <p>Error uploading ${title} for <strong>${client.fields['Account Name']}</strong></p>
            <p>${xhr.responseText}</p>
          </div>
        `);
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

      <div className="row mb-1">
        <div className="col text-left">
          <h3>Clients</h3>
          <label htmlFor="employerName">EmployerName</label>
          <select id="employerName" className="form-control custom-select" onChange={selectClient}>
            <option defaultValue>Select Employer</option>
            {renderEmployerNames()}
          </select>
        </div>
      </div>
      <div className="row">
        <div className="col text-left">
          <p id="csv-clients-import" type="file" name="Import">or Import from CSV</p>
          <input type="file" id="csv-clients-input" accept="*.csv" onChange={(e) => handleClientsCsvFiles(e)} />
          <small className="form-text text-muted text-left">Note: file matches on Salesforce Name in Clients Most up to Date.</small>
        </div>
      </div>

      <div className="row">
        <div className="col text-left">
          <button type="button" className="btn btn-primary" id="uploadButton" onClick={() => uploadChallenge(selectedClient)}>Single Upload</button>
          <img id="spinner" src="images/spinner.svg" />
        </div>
      </div>

      <div className="row">
        <div className="col text-left">
          <button type="button" className="btn btn-primary" onClick={massUpload}>Mass Upload</button>
        </div>
      </div>

      <Footer />

      <Modal />

    </div>
  );
}

export default App;
