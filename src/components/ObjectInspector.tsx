import { useSelection } from '../contexts/SelectionContext';
import './ObjectInspector.css';

export function ObjectInspector() {
  const { selectedObject, setSelectedObject } = useSelection();

  if (!selectedObject) {
    return (
      <div className="object-inspector">
        <div className="inspector-header">
          <h3>Inspector</h3>
        </div>
        <div className="inspector-content empty">
          <p>Click on an object to inspect it</p>
        </div>
      </div>
    );
  }

  const handleClear = () => {
    setSelectedObject(null);
  };

  return (
    <div className="object-inspector">
      <div className="inspector-header">
        <h3>Inspector</h3>
        <button className="clear-btn" onClick={handleClear}>✕</button>
      </div>
      <div className="inspector-content">
        <pre>{JSON.stringify(selectedObject, null, 2)}</pre>
      </div>
    </div>
  );
}
