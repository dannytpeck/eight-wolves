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

    const startDate = '07/01/2020';
    const endDate = '07/31/2020';
    const imageUrl = 'https://images.limeade.com/PDW/4db33758-07f3-434c-9045-da0b5d34c8b7-large.jpg';
    const title = 'Hot Topic: Navigating Difficult Conversations';
    const activityText = 'listen to the Hot Topics Podcast';
    const shortDescription = 'What\'s holding you back from having difficult conversations about topics that matter to you? You\'re not alone - these important conversations are often uncomfortable and inspire strong emotions or defensiveness.';

    const surveyId = 'b96f5af8-2f86-4f49-b42e-5cbc0dd82665';

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
          'AboutChallenge': `<p>It can be hard to hear each other over hurt feelings or anger. However, having these difficult conversations is so important to create positive change.</p><p>In this Hot Topic, host Molly Pracht welcomes Jyotica Barrio, an Aduro Human Performance Coach and founder of Aduro's Diversity, Equity, Inclusion, and Belonging initiatives. Jyotica shares strategies to navigate difficult conversations in ways that foster a deeper connection rather than division, despite your differences.</p><hr size="1" /><h2 style="text-align: center;">Listen to the episode <span style="text-decoration: underline;"><a href="https://vimeo.com/adurolife/review/430544773/139dde9c19" target="_blank" rel="noopener">HERE</a></span>.</h2><hr size="1" /><p style="text-align: center;">After the podcast, be sure to fill out <span style="text-decoration: underline;"><strong><a href="${surveyUrl}" target="_blank" rel="noopener">the survey</a></strong></span>.<br />We'd love to hear from you!</p>`
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
        console.log('Update challenge failed for client', client.fields['Limeade e=']);
      });

    }).fail((request, status, error) => {
      $('#' + employerName.replace(/\s*/g, '')).addClass('bg-danger text-white');
      console.error(request.status);
      console.error(request.responseText);
      console.log('Create challenge failed for client ' + client.fields['Limeade e=']);
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
