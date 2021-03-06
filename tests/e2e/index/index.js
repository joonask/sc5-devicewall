var expect = require('../expect');
var config = require('../../../server/config.js');
var utils = require('../utils');

describe('Frontpage', function() {
  var ptor;
  var label = 'testdevice';
  var indexUrl = config.protocol + '://' + config.host + ':' + config.port + '/';

  // On CI the window size might be too small, so tests are trying to click out of bounds
  browser.driver.manage().window().setSize(1280, 1024);

  beforeEach(function() {

    // PhantomJS crashing randomly if this was not set
    browser.ignoreSynchronization = true;

    browser.get(indexUrl);
    browser.executeScript('localStorage.clear();');
    browser.get(indexUrl);
  });

  afterEach(function() {
    utils.clearDevices();
    browser.executeScript('localStorage.clear();');
  });

  it('should show two buttons to select the mode', function() {
    expect(
      element(
        by.id('container')
      ).getText()
    ).to.eventually.have.length.above(0);
    expect(element(by.css('.button-device')).getText()).to.eventually.contain('Add/Reset device'.toUpperCase());
    expect(element(by.css('.button-control-panel')).getText()).to.eventually.contain('Test website'.toUpperCase());
    expect(browser.getCurrentUrl()).to.eventually.contain('/');
  });

  it('should show device mode if device button clicked', function() {
    element(
      by.css('.button-device')
    ).click();
    expect(browser.getCurrentUrl()).to.eventually.contain('/client');
  });

  it('should show control panel mode if control panel button clicked', function() {
    element(by.css('.button-control-panel')).click();
    expect(browser.getCurrentUrl()).to.eventually.contain('/devices');
  });

  /* disabled automatic redirect because client is unable to access tutorial
  it('should show device mode if device label in localStorage', function() {
    utils.writeSingleTestDevice(label);
    browser.executeScript('localStorage.setItem("label", "' + label + '");');
    browser.get(indexUrl);
    expect(
      element(
        by.id('connection')
      ).isPresent()
    );
    expect(browser.getCurrentUrl()).to.eventually.contain('/client');
  });
  */
});
