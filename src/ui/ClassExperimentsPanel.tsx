import React from "react";

const ClassExperimentsPanel = () => {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Experiments</h2>
        <span className="panel-sub">Coming soon</span>
      </div>
      <div className="panel-body">
        <div className="placeholder">
          This area will show experiments for this class.
          <div className="placeholder-sub">
            We’ll add a “Start Experiment” button and more details here soon.
          </div>
        </div>
        <button className="start-experiment-btn" onClick={() => window.open("/lab/titration", "_blank")}>
          Start Experiment
        </button>
      </div>
    </div>
  );
};

export default ClassExperimentsPanel;
