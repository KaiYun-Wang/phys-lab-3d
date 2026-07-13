package com.wky.backend.config;

import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.MappedJdbcTypes;
import org.apache.ibatis.type.MappedTypes;
import org.postgresql.util.PGobject;

import java.sql.PreparedStatement;
import java.sql.SQLException;

/**
 * PostgreSQL JSONB binding for MyBatis-Plus JacksonTypeHandler.
 * Default JacksonTypeHandler uses setString(), which PG rejects for jsonb columns.
 */
@MappedTypes({Object.class})
@MappedJdbcTypes(JdbcType.OTHER)
public class JsonbTypeHandler extends JacksonTypeHandler {

    public JsonbTypeHandler(Class<?> type) {
        super(type);
    }

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, Object parameter, JdbcType jdbcType)
            throws SQLException {
        PGobject json = new PGobject();
        json.setType("jsonb");
        json.setValue(toJson(parameter));
        ps.setObject(i, json);
    }
}
