import sys
from types import ModuleType

# Create a mock module for pydantic.json_schema
class MockJsonSchema(ModuleType):
    class JsonSchemaValue:
        pass

# Create the mock module
mock_json_schema = MockJsonSchema('pydantic.json_schema')
mock_json_schema.JsonSchemaValue = mock_json_schema.JsonSchemaValue

# Add it to sys.modules
sys.modules['pydantic.json_schema'] = mock_json_schema

print("Mock pydantic.json_schema module created")
