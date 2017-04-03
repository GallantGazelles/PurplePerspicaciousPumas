'use strict';
import React from 'react';
import $ from 'jquery';
import { Button, Form, FormGroup, Col, FormControl, ControlLabel } from 'react-bootstrap';


class LogIn extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      username: '',
      password: '',
      error: false
    }
    this.handleUsernameChange = this.handleUsernameChange.bind(this);
    this.handlePasswordChange = this.handlePasswordChange.bind(this);
    this.handleLogInAttempt = this.handleLogInAttempt.bind(this);
  }


  handleUsernameChange(event) {
    this.setState({
      username: event.target.value
    });
  }

  handlePasswordChange(event) {
    this.setState({
      password: event.target.value
    });
  }

  handleLogInAttempt(username, password) {
    $.ajax({
      url: '/login',
      method: 'POST',
      headers: {'content-type': 'application/json'},
      data: JSON.stringify({'username': username, 'password': password}),
      success: () => {
        this.props.sendToLobby(username);
      },
      error: (err) => {
        this.setState({error: true});
      }
    });
  }

  render() {

    const errorMessage = <p>The username and password you entered did not match our records. Please double check and try again.</p>


    return (
      <Col id="log-in">
        <h4 id="login-header">Log In</h4>
        {this.state.error && errorMessage}
        <FormGroup bsSize="small">
          <Form horizontal>
            <Col>
              <FormControl type="username" placeholder="Username" value={this.state.username} onChange={this.handleUsernameChange} />
            </Col>
          </Form>
        </FormGroup>
        <FormGroup bsSize="small">
          <Form horizontal>
            <Col>
              <FormControl type="password" placeholder="Password" value={this.state.password} onChange={this.handlePasswordChange} />
            </Col>
          </Form>
        </FormGroup>

      <FormGroup bsSize="small">
        <Col>
          <Button type="submit" onClick={() => this.handleLogInAttempt(this.state.username, this.state.password)}>
            Log In
          </Button>
        </Col>
      </FormGroup>
      <br />
    </Col>

    )
  }
}
export default LogIn;