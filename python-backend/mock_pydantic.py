
import sys
from types import ModuleType

# Create a mock module for pydantic.json_schema
class MockJsonSchema(ModuleType):
    class JsonSchemaValue:
        pass
    
    DEFAULT_REF_TEMPLATE = "#/definitions/{model}"

# Create the mock module
mock_json_schema = MockJsonSchema('pydantic.json_schema')
mock_json_schema.JsonSchemaValue = mock_json_schema.JsonSchemaValue
mock_json_schema.DEFAULT_REF_TEMPLATE = mock_json_schema.DEFAULT_REF_TEMPLATE

# Add it to sys.modules
sys.modules['pydantic.json_schema'] = mock_json_schema

print("Mock pydantic.json_schema module created with DEFAULT_REF_TEMPLATE")
