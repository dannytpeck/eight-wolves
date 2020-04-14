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

    const startDate = '2020-04-15';
    const endDate = '2020-12-01';

    const imageUrl = 'https://images.limeade.com/PDW/6fad1d13-2edd-45f2-9262-30d31bcccf13-large.jpg';
    const title = 'COVID-19 Resources on the Aduro App';
    const activityText = 'download the Aduro app';
    const shortDescription = 'Download the Aduro App for timely resources and tools to help in the midst of uncertainty surrounding COVID-19.';
    const longDescription = '<p>Download the Aduro app to access new learning sessions each week that provide tools and resources for all areas of life and well-being to help you navigate the changes and build resilience in the midst of uncertain times.</p><p>When we\'re up against change, uncertainty, and stress, resilience is the key to navigate life and emerge with more happiness and satisfaction. Each week, new learning sessions are delivered straight to your ADURO app so that you can access it wherever you are, right when you need it.</p><p>&nbsp;</p><p>Download the Aduro App via <a style="color: #4f81bd;" href="https://apps.apple.com/us/app/aduro/id1199288368?mt=8" target="_blank" rel="noopener">this link</a> for Apple products.</p><p>Download the Aduro App via <a style="color: #4f81bd;" href="https://play.google.com/store/apps/details?id=com.aduro.amp&amp;hl=en_US" target="_blank" rel="noopener">this link</a> for android users.</p>';

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
