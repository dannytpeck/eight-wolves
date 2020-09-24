import React, { useState, useEffect } from 'react';
import moment from 'moment';

import Airtable from 'airtable';
const base = new Airtable({ apiKey: 'keyCxnlep0bgotSrX' }).base('appHXXoVD1tn9QATh');

import Header from './header';
import Footer from './footer';
import Modal from './modal';

import csvToJson from '../helpers/csv_to_json';

function clientsReducer(state, action) {
  return [...state, ...action];
}

/* globals $ */
function App() {
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

  function uploadChallenge(client) {
    const employerName = client.fields['Limeade e='];

    const startDate = '08/17/2020';
    const endDate = '09/15/2020';
    const imageUrl = 'https://images.limeade.com/PDW/1a98f76f-86ab-4b1e-b977-95a4caec9a4b-large.jpg';
    const title = 'Find Your Flourishing Score';
    const activityText = 'complete the assessment';
    const shortDescription = 'No matter where you are today, you can always discover opportunities to grow and unlock your potential.';

    const surveyId = '035d03dd-dcce-405a-9f99-792063189571';

    const data = {
      'AboutChallenge': '',
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
      'DisplayPriority': 100,
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
      const surveyUrl = `/api/Redirect?url=https%3A%2F%2Fheartbeat.adurolife.com%2Fapp%2Fsurvey%2F%3Fs%3D${surveyId}%26q1%3D${result.Data.ChallengeId}%26q4%3D%5Bparticipantcode%5D%26q5%3D%5Be%5D`;

      $.ajax({
        url: 'https://api.limeade.com/api/admin/activity/' + result.Data.ChallengeId,
        type: 'PUT',
        dataType: 'json',
        data: JSON.stringify({
          'AboutChallenge': `<p>During times of uncertainty, it's more important than ever to take the opportunity to check-in with yourself. How are you doing? What matters most to you right now?</p><p>This five-minute survey helps us personalize recommendations of paths and activities based on your scores. Making it easier for you to take action on what is meaningful to you right now. Please respond to the questions on a scale from 0 to 10.</p><p>The Flourishing Index was developed by <a href="https://hfh.fas.harvard.edu/" target="_blank" rel="noopener">The Human Flourishing Program</a> at Harvard University. The background and motivation for these items and the flourishing domains can be found in: VanderWeele, T.J. (2017). <a href="https://www.pnas.org/content/114/31/8148" target="_blank" rel="noopener">On the promotion of human flourishing</a>. Proceedings of the National Academy of Sciences, U.S.A., 31:8148-8156.</p><p>You can access your results any time by clicking <a href="${surveyUrl}" target="_blank" rel="noopener">here</a>. After reporting your survey completion, you can find this tile in your History tab.</p><p>The Flourishing Index will be available for you to complete four times each year to provide real-time reflection on your life.</p><p><a href="${surveyUrl}" target="_blank" rel="noopener">CLICK HERE TO GET STARTED</a>.</p>`
        }),
        headers: {
          Authorization: 'Bearer ' + client.fields['LimeadeAccessToken']
        },
        contentType: 'application/json; charset=utf-8'
      }).done((result) => {

        // Change row to green on success (and remove red if present)
        $('#' + employerName.replace(/\s*/g, '')).removeClass('bg-danger');
        $('#' + employerName.replace(/\s*/g, '')).addClass('bg-success text-white');
        $('#' + employerName.replace(/\s*/g, '') + ' .challenge-id').html(`<a href="${client.fields['Domain']}/admin/program-designer/activities/activity/${result.Data.ChallengeId}" target="_blank">${result.Data.ChallengeId}</a>`);

      }).fail((request, status, error) => {
        $('#' + employerName.replace(/\s*/g, '')).addClass('bg-danger text-white');
        console.error(request.status);
        console.error(request.responseText);
        console.error('Update challenge failed for client', client.fields['Limeade e=']);
      });

    }).fail((request, status, error) => {
      $('#' + employerName.replace(/\s*/g, '')).addClass('bg-danger text-white');
      console.error(request.status);
      console.error(request.responseText);
      console.error('Create challenge failed for client ' + client.fields['Limeade e=']);
    });

  }

  function handleClientsCsvFiles(e) {
    let reader = new FileReader();
    reader.onload = function() {
      // Parse the client csv and update state
      const clientsJson = csvToJson(reader.result);
      setClientsFromCsv(clientsJson);
    };
    // Start reading the file. When it is done, calls the onload event defined above.
    reader.readAsBinaryString(e.target.files[0]);
  }

  function renderClients() {
    const accountNamesList = clientsFromCsv.map(client => client['Account: Account Name']);

    // Filter clients by the list of account names in the user uploaded CSV
    const filteredClients = clients.filter(client => {
      return accountNamesList.includes(client.fields['Salesforce Name']);
    });

    const sortedClients = [...filteredClients];

    sortedClients.sort((a, b) => {

      // Send an error if Salesforce Name is missing so we can fix in Airtable
      if (!a.fields['Salesforce Name']) {
        console.error('Salesforce Name not found in record', a);
      }

      const nameA = a.fields['Salesforce Name'].toLowerCase();
      const nameB = b.fields['Salesforce Name'].toLowerCase();
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0;
    });

    return sortedClients.map((client) => {
      const employerName = client.fields['Limeade e='];

      return (
        <tr id={employerName.replace(/\s*/g, '')} key={employerName}>
          <td>
            <a href={client.fields['Domain'] + '/ControlPanel/RoleAdmin/ViewChallenges.aspx?type=employer'} target="_blank">{client.fields['Salesforce Name']}</a>
          </td>
          <td className="challenge-id"></td>
          <td>
            <button type="button" className="btn btn-primary" onClick={() => uploadChallenge(client)}>Upload</button>
          </td>
        </tr>
      );
    });

  }

  return (
    <div id="app">
      <Header />

      <div className="form-group">
        <label htmlFor="csvClientsInput">Import from CSV</label>
        <input type="file" className="form-control-file" id="csvClientsInput" accept="*.csv" onChange={(e) => handleClientsCsvFiles(e)} />
        <small className="form-text text-muted text-left">Note: file matches on Salesforce Name in Clients Most up to Date.</small>
      </div>

      <table className="table table-hover table-striped" id="activities">
        <thead>
          <tr>
            <th scope="col">Salesforce Name</th>
            <th scope="col">Challenge Id</th>
            <th scope="col">Upload</th>
          </tr>
        </thead>
        <tbody>
          {clientsFromCsv ? renderClients() : <tr />}
        </tbody>
      </table>

      <Footer />

      <Modal />

    </div>
  );
}

export default App;
