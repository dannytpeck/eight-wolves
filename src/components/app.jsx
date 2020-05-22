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

  const [startDate, setStartDate] = useState('2020-05-22');
  const [endDate, setEndDate] = useState('2020-07-01');

  const [challengeId, setChallengeId] = useState(null); // adding this in case we use the app for updating tiles. Could be fancy.
  const [imageUrl, setImageUrl] = useState('https://images.limeade.com/PDW/805d6a9d-186e-4462-8fe2-ca97a478ffca-large.jpg');
  const [title, setTitle] = useState('Uploaded from Eight Wolves');
  const [activityText, setActivityText] = useState('test the upload');
  const [shortDescription, setShortDescription] = useState('Test upload from Eight Wolves.');
  const [longDescription, setLongDescription] = useState('<p>So many wolves.</p>');

  // TODO: add remaining state variables
  const [allowSelfReport, setAllowSelfReport] = useState(0);
  const [challengeTarget, setChallengeTarget] = useState(1);
  const [challengeType, setChallengeType] = useState('OneTimeEvent');
  const [displayPriority, setDisplayPriority] = useState(null);
  const [enableDeviceTracking, setEnableDeviceTracking] = useState(0);
  const [eventCode, setEventCode] = useState(null); // adding this in case we ever need it

  const [isFeatured, setIsFeatured] = useState(0);
  const [isWeekly, setIsWeekly] = useState(0);

  const [isTeamChallenge, setIsTeamChallenge] = useState(0);
  const [minTeamSize, setMinTeamSize] = useState('');
  const [maxTeamSize, setMaxTeamSize] = useState('');

  const [partnerId, setPartnerId] = useState(0);

  const [pointValue, setPointValue] = useState(0);

  // Targeting state values
  const [subgroup, setSubgroup] = useState(null);
  const [field1, setField1] = useState(null);
  const [field1Value, setField1Value] = useState(null);
  const [field2, setField2] = useState(null);
  const [field2Value, setField2Value] = useState(null);
  const [field3, setField3] = useState(null);
  const [field3Value, setField3Value] = useState(null);



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
    console.log(e);
    var reader = new FileReader();
    reader.onload = function() {
      // Do something with the data
      var clientsJson = csvToJson(reader.result)[0];
      console.log(clientsJson);

      // TODO: parse the clients csv and update state

      // TODO: fix issue where it only parses first row in csv

    };
    // start reading the file. When it is done, calls the onload event defined above.
    reader.readAsBinaryString(document.querySelector('#csv-clients-input').files[0]);
  }

  function handleChallengesCsvFiles(e) {
    console.log(e);
    var reader = new FileReader();
    reader.onload = function() {
      // Do something with the data
      var challengesJson = csvToJson(reader.result)[0];
      console.log(challengesJson);

      // parse the challenges csv and update the state values
      setChallengeId(challengesJson.ChallengeId);
      setChallengeType(challengesJson.ChallengeType);
      setIsWeekly(challengesJson.IsWeekly);
      // skipping WinStrategy since the upload doesn't seem to need it
      setChallengeTarget(challengesJson.Target);
      setActivityText(challengesJson.Activity);
      setTitle(challengesJson.ChallengeName);
      setDisplayPriority(challengesJson.DisplayPriority);
      setStartDate(challengesJson.StartDate);
      setEndDate(challengesJson.EndDate);
      setShortDescription(challengesJson.ShortDescription);
      setLongDescription(challengesJson.MoreInformation);
      setImageUrl(challengesJson.ImageUrl);
      // skipping ShowInProgram since we determine it during upload
      // skipping RewardType because what is it even
      setPointValue(challengesJson.Reward);
      // skipping Dimensions becasue eff 'em
      // skipping Leaderboard
      setEnableDeviceTracking(challengesJson.EnableDeviceTracking);
      setAllowSelfReport(challengesJson.AllowSelfReporting);
      // skipping DeviceTrackingUnits, not sure where it fits in the upload
      setIsTeamChallenge(challengesJson.IsTeamChallenge);
      setMinTeamSize(challengesJson.MinTeamSize);
      setMaxTeamSize(challengesJson.MaxTeamSize);
      setSubgroup(challengesJson.Subgroup);
      setField1(challengesJson.Field1);
      setField1Value(challengesJson.Field1Value);
      setField2(challengesJson.Field2);
      setField2Value(challengesJson.Field2Value);
      setField3(challengesJson.Field3);
      setField3Value(challengesJson.Field3Value);
      // skipping Appearance
      setPartnerId(challengesJson.IntegrationPartnerId);
      // skipping ButtonText since we determine it during upload
      // skipping TargetUrl since we determine it during upload
      setEventCode(challengesJson.EventCode);
      // skipping ShowExtendedDescription since we determine it during upload
      // skipping ActivityTemplateId, what even is that
      setIsFeatured(challengesJson.IsFeatured);
      // skippingFeaturedDescription since we determine it during upload
      // skipping FeaturedImageUrl since we determine it during upload

    };
    // start reading the file. When it is done, calls the onload event defined above.
    reader.readAsBinaryString(document.querySelector('#csv-challenges-input').files[0]);
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

  function sanitize(code) {
    let sanitized = code
      .replace(/\r?\n|\r/g, ' ')     // Strip out carriage returns and newlines
      .replace(/\u2018/g, '\'')      // Left single quote
      .replace(/\u2019/g, '\'')      // Right single quote
      .replace(/\u201C/g, '"')       // Left double quote
      .replace(/\u201D/g, '"')       // Right double quote
      .replace(/\u2026/g, '...')     // Ellipsis
      .replace(/\u2013/g, '&ndash;') // Long dash
      .replace(/\u2014/g, '&mdash;') // Longer dash
      .replace(/\u00A9/g, '&copy;');  // Copyright symbol
    return sanitized;
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

    let frequency = '';
    if (enableDeviceTracking === 1) {
      frequency = 'Daily';
    } else if (isWeekly === 1) {
      frequency = 'Weekly'; // this order is intentional, since Weekly Steps have Frequency of Weekly
    } else {
      frequency = 'None';
    }

    // most of the time, Activity Type is the activityText, unless it's a weekly units non-device challenge
    let activityType = '';
    if (enableDeviceTracking === 1 && isWeekly === 1) {
      activityType = '';
    } else {
      activityType = activityText;
    }
    
    let amountUnit = 'times';
    switch (enableDeviceTracking) {
      case 1:
        if (isWeekly === 0) {
          amountUnit = 'steps';
        } else if (isWeekly === 1) {
          amountUnit = activityText;
        }
        break;
      case 0:
        amountUnit = 'times';
        break;
    }

    // prepping for splitting tags for upload
    let tagValues1 = [];
    let tagValues2 = [];
    let tagValues3 = [];

    // conditionally setting the tags in case there are fewer than 3 targeting columns
    let tags = [];
    function makeTags() {
      field1 ? tags.push({
        'TagName': field1 ? field1 : '',
        'TagValues':
          field1Value ? tagValues1.concat(field1Value.split('|').map(tag => tag.trim())) : '' // splitting tags on the | like Limeade, also trimming out whitespace just in case
      }) : null;
      field2 ? tags.push({
        'TagName': field2 ? field2 : '',
        'TagValues':
          field2Value ? tagValues2.concat(field2Value.split('|').map(tag => tag.trim())) : ''
      }) : null;
      field3 ? tags.push({
        'TagName': field3 ? field3 : '',
        'TagValues':
          field3Value ? tagValues3.concat(field3Value.split('|').map(tag => tag.trim())) : ''
      }) : null;
      return tags;
    }

    const data = {
      'AboutChallenge': sanitize(longDescription),
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
      'ShortDescription': sanitize(shortDescription),
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

      <div className="row mb-1">
        <div className="col text-left">
          <h3>Challenge Content</h3>
          <p id="csv-challenges-import" type="file" name="Import">Import from CSV</p>
          <input type="file" id="csv-challenges-input" accept="*.csv" onChange={(e) => handleChallengesCsvFiles(e)} />
        </div>
      </div>
      <div className="row">
        <div className="col text-left">
          {/* TODO: add challenge form inputs here */}
        </div>
      </div>

      <div className="row">
        <div className="col text-left">
          <button type="button" className="btn btn-primary" id="uploadButton" onClick={() => uploadChallenge(selectedClient)}>Single Upload</button>
          <img id="spinner" src="images/spinner.svg" />
        </div>
      </div>

      <Footer />

      <Modal />

    </div>
  );
}

export default App;
