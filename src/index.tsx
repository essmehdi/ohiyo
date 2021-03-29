import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import * as serviceWorker from './serviceRegister'

ReactDOM.render(
    <App />,
    document.getElementById('root')
);

serviceWorker.localServiceWorkerRegister()