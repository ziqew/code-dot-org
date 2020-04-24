# == Schema Information
#
# Table name: contact_rollups_raw
#
#  id              :integer          not null, primary key
#  email           :string(255)      not null
#  sources         :string(255)      not null
#  data            :json
#  data_updated_at :datetime         not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#
# Indexes
#
#  index_contact_rollups_raw_on_email_and_sources  (email,sources) UNIQUE
#

class ContactRollupsRaw < ApplicationRecord
  self.table_name = 'contact_rollups_raw'

  def self.truncate_table
    ActiveRecord::Base.connection.execute("TRUNCATE TABLE #{table_name}")
  end

  def self.extract_email_preferences
    query = extract_from_source_query('email_preferences', ['opt_in'], 'email')
    ActiveRecord::Base.connection.execute(query)
  end

  # @param source [String] Source from which we want to extract data
  # @param data_columns [Array] Columns we want reshaped into a single JSON object
  # @param email_column [String] Column in source table we want to insert ino the email column
  # @return [String] A SQL statement to extract and reshape data from the source table.
  def self.extract_from_source_query(source, data_columns, email_column)
    <<~SQL
      INSERT INTO #{ContactRollupsRaw.table_name} (email, sources, data, data_updated_at, created_at, updated_at)
      SELECT
        #{email_column},
        'dashboard.#{source}' AS sources,
        #{create_json_object(data_columns)} AS data,
        #{source}.updated_at AS data_updated_at,
        NOW() AS created_at,
        NOW() AS updated_at
      FROM #{source}
      WHERE #{email_column} IS NOT NULL AND #{email_column} != ''
    SQL
  end

  # Generates a string with the MySQL syntax used in a SELECT statement
  # to create a JSON object out of multiple database columns.
  # @example
  #   Input: ['age', 'name', 'email']
  #   Output: "JSON_OBJECT('age', age, 'name', name, 'email', email)"
  # @param columns [Array] Column names to reshape
  # @return [String] MySQL JSON_OBJECT() syntax for insertion
  def self.create_json_object(columns)
    return 'NULL' if columns.empty?

    'JSON_OBJECT(' + columns.map {|col| "'#{col}',#{col}"}.join(',') + ')'
  end
end
