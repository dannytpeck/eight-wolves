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

  function massUpload() {
    // Open the modal
    $('#uploadModal').modal();

    let timer = 0;

    // Upload to coaching clients
    const filteredClients = clients.filter(client => {
      return client.fields['Failed Upload'] === '1';
    });

    // Set counter based on filteredClients
    $('#counter').html(`<p><span id="finishedUploads">0</span> / ${filteredClients.length}</p>`);

    filteredClients.map(client => {
      // 2 seconds between ajax requests, because limeade is bad and returns 500 errors if we go too fast
      timer += 2000;
      setTimeout(() => {
        uploadChallenge(client);
      }, timer);
    });
  }

  function uploadChallenge(client) {
    // Open the modal
    $('#uploadModal').modal();

    const startDate = '2020-04-01';
    const endDate = '2020-04-30';
    const imageUrl = 'https://images.limeade.com/PDW/4db33758-07f3-434c-9045-da0b5d34c8b7-large.jpg';
    const title = 'Hot Topic: Working From Home Wisely';
    const activityText = 'listen to the recording';
    const shortDescription = 'Complete the Hot Topics Podcast.';

    const surveyId = 'f4da09d7-59ac-4536-a13b-a59c5d38245a';

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
      'DisplayPriority': null,
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
          'AboutChallenge': `<p>For many of us, the idea of working remotely was a new concept until recent events. If you are transitioning from working in an office to working at home, you're not alone. In this episode of Hot Topics, Coach Elyse explores some ways you can create some normalcy and structure while working from home.</p><p>Listen to the episode <a href="https://vimeo.com/adurolife/review/398697728/8791350656" target="_blank" rel="noopener">here.</a></p><p>After the podcast, be sure to fill out <a href="${surveyUrl}" target="_blank" rel="noopener">the survey</a>. We'd love to hear from you!</p><p style="font-size: 0.7em;">&copy; Copyright 2020 <a style="text-decoration: none;" href="http://www.adurolife.com/" target="_blank" rel="noopener">ADURO, INC.</a> All rights reserved.</p>`
        }),
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
        console.log('Update challenge failed for client', client.fields['Limeade e=']);
      });

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

        <div className="col text-right">
          <button type="button" className="btn btn-danger" id="uploadButton" onClick={() => massUpload()}>Mass Upload</button>
          <img id="spinner" src="images/spinner.svg" />
        </div>
      </div>

      <Footer />

      <Modal />

    </div>
  );
}

export default App;
